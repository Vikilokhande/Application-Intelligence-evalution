import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.extraction.providers import get_llm_provider
from app.knowledge.service import knowledge_base
from app.models import Application, Document, Evidence, ExtractedData, Scheme, ValidationResult
from app.normalization.service import get_profile_value

logger = logging.getLogger(__name__)

VALIDATION_VERSION = "1.1"

DETERMINISTIC_TYPES = {
    "SCHEMA",
    "REQUIRED_FIELD",
    "COMPLETENESS",
    "REQUIRED_DOCUMENT",
    "DATA_RANGE",
    "BUSINESS_RULE_PRECHECK",
    "CROSS_DOCUMENT_CONSISTENCY",
    "AUTHENTICITY_INDICATOR",
    "DUPLICATE_DETECTION",
    "SUSPICIOUS_INDICATOR",
}
RAG_TYPES = {
    "SCHEME_KNOWLEDGE_RETRIEVAL",
    "RAG_PROJECT_COST_LIMIT",
    "RAG_PROJECT_DURATION_LIMIT",
    "RAG_ORGANIZATION_ELIGIBILITY",
    "RAG_PROJECT_CATEGORY_ELIGIBILITY",
    "RAG_REQUIRED_DOCUMENTS",
    "RAG_SCHEME_VALIDATION",
}


MONEY_LIMIT_PATTERNS = [
    re.compile(
        r"maximum(?:\s+allowable)?(?:\s+total)?\s+project\s+cost.*?(?:is|<=|not\s+exceed|exceeding)\s*"
        r"(?:inr|rs\.?|\u20b9)?\s*([0-9][0-9,\.]*)\s*(lakh|lakhs|crore|crores)?",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(
        r"project\s+cost\s+exceeding\s*(?:inr|rs\.?|\u20b9)?\s*([0-9][0-9,\.]*)\s*(lakh|lakhs|crore|crores)?",
        re.IGNORECASE,
    ),
]
DURATION_LIMIT_PATTERNS = [
    re.compile(
        r"maximum(?:\s+eligible)?\s+project\s+duration.*?(?:is|<=|not\s+exceed|more\s+than)\s*"
        r"([0-9]{1,3})\s*(?:months|month)",
        re.IGNORECASE | re.DOTALL,
    ),
    re.compile(r"projects\s+spanning\s+more\s+than\s+([0-9]{1,3})\s*months", re.IGNORECASE),
]


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _money_to_number(value_text: str, unit: str | None) -> float:
    value = float(value_text.replace(",", ""))
    normalized_unit = (unit or "").lower()
    if normalized_unit.startswith("lakh"):
        return value * 100_000
    if normalized_unit.startswith("crore"):
        return value * 10_000_000
    return value


def _category_for(validation_type: str) -> tuple[str, str]:
    if validation_type in RAG_TYPES or validation_type.startswith("RAG_"):
        return "KNOWLEDGE_RAG", "rag"
    if validation_type == "DOCUMENT_LLM":
        return "DOCUMENT_LLM", "llm"
    return "DETERMINISTIC", "deterministic"


def _severity_counts(results: list[ValidationResult]) -> dict[str, int]:
    severities = {"CRITICAL": 0, "ERROR": 0, "WARNING": 0, "INFO": 0}
    for result in results:
        severity = (result.severity or "INFO").upper()
        if severity in severities:
            severities[severity] += 1
    return severities


def build_validation_summary(results: list[ValidationResult]) -> dict[str, Any]:
    total = len(results)
    passed = sum(1 for item in results if item.status == "PASS")
    failed = sum(1 for item in results if item.status == "FAIL")
    warnings = sum(1 for item in results if item.status == "WARN")
    not_checked = sum(1 for item in results if item.status == "NOT_CHECKED")
    severity_counts = _severity_counts(results)
    confidences = [
        float((item.evidence or {}).get("confidence", 0.0))
        for item in results
        if (item.evidence or {}).get("confidence") is not None
    ]
    if failed or severity_counts["CRITICAL"] or severity_counts["ERROR"]:
        overall = "FAIL"
    elif warnings:
        overall = "WARNING"
    elif total and not_checked == total:
        overall = "NOT_CHECKED"
    elif not_checked and not passed:
        overall = "NOT_CHECKED"
    else:
        overall = "PASS"
    return {
        "overall_status": overall,
        "total_checks": total,
        "passed": passed,
        "failed": failed,
        "warnings": warnings,
        "not_checked": not_checked,
        "critical_count": severity_counts["CRITICAL"],
        "error_count": severity_counts["ERROR"],
        "warning_count": severity_counts["WARNING"],
        "info_count": severity_counts["INFO"],
        "validation_confidence": round(sum(confidences) / len(confidences), 3) if confidences else 0.0,
    }


class ValidationService:
    def validate(self, db: Session, application: Application, profile: dict[str, Any], scheme: Scheme | None) -> list[ValidationResult]:
        started = time.monotonic()
        db.execute(delete(ValidationResult).where(ValidationResult.application_id == application.id))
        documents = db.scalars(select(Document).where(Document.application_id == application.id)).all()
        results: list[ValidationResult] = []

        audit_service.record(
            db,
            "VALIDATION_STARTED",
            application_id=application.id,
            actor_id="SYSTEM",
            payload={"stage": "VALIDATE", "version": VALIDATION_VERSION},
        )

        deterministic_results = [
            self._result(application.id, "SCHEMA", "PASS", "Normalized application profile is structurally valid."),
            *self._required_fields(application.id, profile),
            self._completeness(application.id, profile),
            *self._required_documents(application.id, documents, scheme),
            *self._data_type_and_range(application.id, profile),
            self._business_rule_precheck(application.id, profile),
            *self._cross_document_consistency(db, application.id, profile),
            *self._authenticity_indicators(application.id, documents, profile),
            self._duplicate_detection(db, application),
            self._suspicious_indicators(application.id, profile),
        ]
        llm_results = self._document_llm_validation(db, application.id, documents)
        rag_results = self._scheme_knowledge_validation(db, application.id, profile, scheme)

        results.extend(
            [*deterministic_results, *llm_results, *rag_results]
        )

        for result in results:
            db.add(result)
            logger.info(
                "[PIPELINE] application=%s stage=VALIDATE validator=%s check_id=%s status=%s confidence=%.3f",
                application.id,
                (result.evidence or {}).get("validator", "deterministic"),
                (result.evidence or {}).get("check_id", result.validation_type),
                result.status,
                float((result.evidence or {}).get("confidence", 1.0)),
            )
            if result.status == "FAIL":
                audit_service.record(
                    db,
                    "VALIDATION_RULE_FAILED",
                    application_id=application.id,
                    actor_id="SYSTEM",
                    payload={
                        "stage": "VALIDATE",
                        "check_id": (result.evidence or {}).get("check_id", result.validation_type),
                        "validator": (result.evidence or {}).get("validator", "deterministic"),
                        "severity": result.severity,
                        "version": VALIDATION_VERSION,
                    },
                )
        for document in documents:
            document.validation_status = "VALIDATED"
        summary = build_validation_summary(results)
        audit_service.record(
            db,
            "VALIDATION_COMPLETED",
            application_id=application.id,
            actor_id="SYSTEM",
            payload={
                "stage": "VALIDATE",
                "duration_ms": round((time.monotonic() - started) * 1000),
                "summary": summary,
                "version": VALIDATION_VERSION,
            },
        )
        return results

    def _result(
        self,
        application_id: str,
        validation_type: str,
        status: str,
        message: str,
        severity: str = "INFO",
        evidence: dict[str, Any] | None = None,
        *,
        check_id: str | None = None,
        name: str | None = None,
        confidence: float | None = None,
        expected: dict[str, Any] | None = None,
        actual: dict[str, Any] | None = None,
        evidence_items: list[dict[str, Any]] | None = None,
        source_documents: list[str] | None = None,
        source_pages: list[Any] | None = None,
        rule_version: str = VALIDATION_VERSION,
    ) -> ValidationResult:
        category, validator = _category_for(validation_type)
        payload = dict(evidence or {})
        payload.setdefault("validation_category", category)
        payload.setdefault("check_id", check_id or validation_type)
        payload.setdefault("name", name or validation_type.replace("_", " ").title())
        payload.setdefault("status", status)
        payload.setdefault("severity", severity)
        payload.setdefault("confidence", 1.0 if confidence is None and status in {"PASS", "FAIL"} else confidence or 0.0)
        payload.setdefault("reason", message)
        payload.setdefault("expected", expected or {})
        payload.setdefault("actual", actual or {})
        payload.setdefault("evidence", evidence_items or [])
        payload.setdefault("source_documents", source_documents or [])
        payload.setdefault("source_pages", source_pages or [])
        payload.setdefault("rule_version", rule_version)
        payload.setdefault("validator", validator)
        payload.setdefault("generated_at", _utc_iso())
        return ValidationResult(
            application_id=application_id,
            validation_type=validation_type,
            status=status,
            message=message,
            severity=severity,
            evidence=payload,
        )

    def _required_fields(self, application_id: str, profile: dict[str, Any]) -> list[ValidationResult]:
        required = {
            "applicant.name": "Applicant name is required.",
            "project.title": "Project title is required.",
            "financial.project_cost": "Project cost is required.",
            "timeline.duration_months": "Project duration is required.",
        }
        results: list[ValidationResult] = []
        for path, message in required.items():
            value = get_profile_value(profile, path)
            if value in (None, ""):
                results.append(self._result(application_id, "REQUIRED_FIELD", "FAIL", message, "ERROR", {"field": path}))
            else:
                results.append(self._result(application_id, "REQUIRED_FIELD", "PASS", f"{path} is present.", "INFO", {"field": path}))
        return results

    def _completeness(self, application_id: str, profile: dict[str, Any]) -> ValidationResult:
        fields = ["applicant.name", "project.title", "financial.project_cost", "timeline.duration_months"]
        present = sum(1 for field in fields if get_profile_value(profile, field) not in (None, ""))
        score = present / len(fields)
        status = "PASS" if score == 1 else "WARN" if score >= 0.5 else "FAIL"
        return self._result(
            application_id,
            "COMPLETENESS",
            status,
            f"Application field completeness is {score:.0%}.",
            "WARNING" if status == "WARN" else "ERROR" if status == "FAIL" else "INFO",
            {"score": score, "present": present, "required": len(fields)},
        )

    def _required_documents(
        self, application_id: str, documents: list[Document], scheme: Scheme | None
    ) -> list[ValidationResult]:
        required: list[str] = []
        if scheme:
            for rule in scheme.rules:
                if rule.active and rule.rule_type == "required_documents":
                    required.extend(rule.condition.get("document_types", []))
        if not required:
            present = sorted({document.document_type for document in documents})
            return [
                self._result(
                    application_id,
                    "REQUIRED_DOCUMENT",
                    "WARN",
                    "No active required-document rule is configured for this scheme.",
                    "WARNING",
                    {"required": [], "present": present, "missing": [], "configuration_missing": True},
                )
            ]
        present = {document.document_type for document in documents}
        missing = sorted(set(required) - present)
        status = "PASS" if not missing else "FAIL"
        return [
            self._result(
                application_id,
                "REQUIRED_DOCUMENT",
                status,
                "All required documents are present." if not missing else f"Missing required documents: {', '.join(missing)}.",
                "ERROR" if missing else "INFO",
                {"required": required, "present": sorted(present), "missing": missing},
            )
        ]

    def _data_type_and_range(self, application_id: str, profile: dict[str, Any]) -> list[ValidationResult]:
        results: list[ValidationResult] = []
        cost = get_profile_value(profile, "financial.project_cost")
        duration = get_profile_value(profile, "timeline.duration_months")
        results.append(self._numeric_check(application_id, "DATA_RANGE", "financial.project_cost", cost, min_value=1))
        results.append(self._numeric_check(application_id, "DATA_RANGE", "timeline.duration_months", duration, min_value=1, max_value=120))
        return results

    def _numeric_check(
        self,
        application_id: str,
        validation_type: str,
        field: str,
        value: Any,
        min_value: float | None = None,
        max_value: float | None = None,
    ) -> ValidationResult:
        if value in (None, ""):
            return self._result(application_id, validation_type, "FAIL", f"{field} is missing.", "ERROR", {"field": field})
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return self._result(application_id, validation_type, "FAIL", f"{field} is not numeric.", "ERROR", {"field": field, "actual": value})
        if min_value is not None and numeric < min_value:
            return self._result(application_id, validation_type, "FAIL", f"{field} is below allowed range.", "ERROR", {"field": field, "actual": numeric})
        if max_value is not None and numeric > max_value:
            return self._result(application_id, validation_type, "FAIL", f"{field} is above allowed range.", "ERROR", {"field": field, "actual": numeric})
        return self._result(application_id, validation_type, "PASS", f"{field} is within expected range.", "INFO", {"field": field, "actual": numeric})

    def _business_rule_precheck(self, application_id: str, profile: dict[str, Any]) -> ValidationResult:
        org_type = get_profile_value(profile, "applicant.organization_type")
        if not org_type:
            return self._result(application_id, "BUSINESS_RULE_PRECHECK", "WARN", "Organization type is missing and may affect eligibility.", "WARNING")
        return self._result(application_id, "BUSINESS_RULE_PRECHECK", "PASS", "Basic business-rule prerequisites are available.")

    def _document_llm_validation(
        self,
        db: Session,
        application_id: str,
        documents: list[Document],
    ) -> list[ValidationResult]:
        extracted = db.scalars(select(ExtractedData).where(ExtractedData.application_id == application_id)).all()
        snippets: list[dict[str, Any]] = []
        document_by_id = {document.id: document for document in documents}
        for item in extracted:
            if not item.document_id or item.document_id not in document_by_id:
                continue
            raw = item.raw_data or {}
            text_excerpt = str(raw.get("text_excerpt", "")).strip()
            if not text_excerpt:
                continue
            doc = document_by_id[item.document_id]
            snippets.append(
                {
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "declared_or_classified_type": doc.document_type,
                    "summary": raw.get("summary", ""),
                    "text_excerpt": text_excerpt[:1200],
                }
            )

        if not snippets:
            return [
                self._result(
                    application_id,
                    "DOCUMENT_LLM",
                    "NOT_CHECKED",
                    "No extracted document text was available for LLM document validation.",
                    "WARNING",
                    {"documents": [document.id for document in documents]},
                    check_id="DOCUMENT_LLM_NOT_CHECKED",
                    confidence=0.0,
                )
            ]

        prompt = (
            "Validate these extracted application documents for semantic document-quality issues. "
            "Do not check simple numeric limits. Use only provided excerpts. Return strict JSON with key "
            "'document_validation', containing objects with check_id, status, confidence, reason, evidence. "
            "Evidence items must include document_id and a short text quote copied from the provided excerpt. "
            "If no evidence supports a finding, return status NOT_CHECKED for that check.\n\n"
            f"Documents JSON:\n{json.dumps(snippets[:6], ensure_ascii=False)}\n\n"
            "Return format: {\"document_validation\":[{\"check_id\":\"DOC_TYPE_CONSISTENCY\","
            "\"status\":\"PASS|FAIL|WARN|NOT_CHECKED\",\"confidence\":0.0,\"reason\":\"...\","
            "\"evidence\":[{\"document_id\":\"...\",\"page\":null,\"text\":\"...\"}]}]}"
        )

        started = time.monotonic()
        try:
            llm = get_llm_provider(get_settings())
            raw = llm.generate(prompt)
            parsed = self._extract_json_object(raw)
            checks = parsed.get("document_validation")
            if not isinstance(checks, list):
                raise ValueError("document_validation must be a list")
        except (LLMProviderError, ValueError, json.JSONDecodeError) as exc:
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.warning(
                "[PIPELINE] application=%s stage=VALIDATE validator=llm check_id=DOCUMENT_LLM status=NOT_CHECKED error_type=%s error_message=%s duration_ms=%d",
                application_id, type(exc).__name__, str(exc)[:200], duration_ms,
            )
            audit_service.record(
                db,
                "DOCUMENT_LLM_VALIDATION_COMPLETED",
                application_id=application_id,
                actor_id="AI",
                payload={
                    "stage": "VALIDATE",
                    "validator": "llm",
                    "status": "NOT_CHECKED",
                    "error_type": type(exc).__name__,
                    "duration_ms": duration_ms,
                    "version": VALIDATION_VERSION,
                },
            )
            return [
                self._result(
                    application_id,
                    "DOCUMENT_LLM",
                    "NOT_CHECKED",
                    "LLM document validation could not be completed.",
                    "WARNING",
                    {"error_type": type(exc).__name__, "error_message": str(exc)[:300]},
                    check_id="DOCUMENT_LLM_NOT_CHECKED",
                    confidence=0.0,
                )
            ]

        doc_ids = {item["document_id"] for item in snippets}
        results: list[ValidationResult] = []
        for check in checks[:12]:
            if not isinstance(check, dict):
                continue
            status = str(check.get("status", "NOT_CHECKED")).upper()
            if status not in {"PASS", "FAIL", "WARN", "NOT_CHECKED"}:
                status = "NOT_CHECKED"
            evidence_items = check.get("evidence") if isinstance(check.get("evidence"), list) else []
            valid_evidence = [
                item
                for item in evidence_items
                if isinstance(item, dict) and item.get("document_id") in doc_ids and str(item.get("text", "")).strip()
            ]
            if status in {"PASS", "FAIL", "WARN"} and not valid_evidence:
                status = "NOT_CHECKED"
            severity = "ERROR" if status == "FAIL" else "WARNING" if status in {"WARN", "NOT_CHECKED"} else "INFO"
            results.append(
                self._result(
                    application_id,
                    "DOCUMENT_LLM",
                    status,
                    str(check.get("reason") or "LLM document validation check completed."),
                    severity,
                    {
                        "llm_check_id": check.get("check_id"),
                        "source_documents": [item.get("document_id") for item in valid_evidence],
                    },
                    check_id=str(check.get("check_id") or "DOCUMENT_LLM_CHECK"),
                    confidence=float(check.get("confidence", 0.0) or 0.0),
                    evidence_items=valid_evidence,
                    source_documents=[str(item.get("document_id")) for item in valid_evidence],
                    source_pages=[item.get("page") for item in valid_evidence if item.get("page") is not None],
                )
            )

        if not results:
            results.append(
                self._result(
                    application_id,
                    "DOCUMENT_LLM",
                    "NOT_CHECKED",
                    "LLM document validation returned no usable checks.",
                    "WARNING",
                    {},
                    check_id="DOCUMENT_LLM_EMPTY_RESPONSE",
                    confidence=0.0,
                )
            )

        audit_service.record(
            db,
            "DOCUMENT_LLM_VALIDATION_COMPLETED",
            application_id=application_id,
            actor_id="AI",
            payload={
                "stage": "VALIDATE",
                "validator": "llm",
                "checks": len(results),
                "duration_ms": round((time.monotonic() - started) * 1000),
                "version": VALIDATION_VERSION,
            },
        )
        return results

    @staticmethod
    def _extract_json_object(text: str) -> dict[str, Any]:
        text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"```\s*$", "", text).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if not match:
                raise
            return json.loads(match.group())

    def _scheme_knowledge_validation(
        self,
        db: Session,
        application_id: str,
        profile: dict[str, Any],
        scheme: Scheme | None,
    ) -> list[ValidationResult]:
        if scheme is None:
            return [
                self._result(
                    application_id,
                    "SCHEME_KNOWLEDGE_RETRIEVAL",
                    "NOT_CHECKED",
                    "No scheme is linked, so scheme knowledge validation could not run.",
                    "WARNING",
                    check_id="RAG_SCHEME_NOT_LINKED",
                    confidence=0.0,
                )
            ]

        query = (
            f"{scheme.name} {scheme.code} maximum project cost maximum eligible project duration "
            "required documents eligibility financial limits"
        )
        try:
            retrieved = knowledge_base.query(query, limit=5)
        except Exception as exc:  # noqa: BLE001
            return [
                self._result(
                    application_id,
                    "SCHEME_KNOWLEDGE_RETRIEVAL",
                    "NOT_CHECKED",
                    "Scheme knowledge retrieval is unavailable; validation used database rules only.",
                    "WARNING",
                    {"error": str(exc), "scheme_id": scheme.id},
                    check_id="RAG_RETRIEVAL_UNAVAILABLE",
                    confidence=0.0,
                )
            ]

        if not retrieved:
            return [
                self._result(
                    application_id,
                    "SCHEME_KNOWLEDGE_RETRIEVAL",
                    "NOT_CHECKED",
                    "No relevant scheme guideline chunks were retrieved.",
                    "WARNING",
                    {"scheme_id": scheme.id, "query": query},
                    check_id="RAG_NO_RELEVANT_CHUNKS",
                    confidence=0.0,
                )
            ]

        cost_limit, cost_source = self._extract_cost_limit(retrieved)
        duration_limit, duration_source = self._extract_duration_limit(retrieved)
        allowed_orgs, org_source = self._extract_allowed_values(retrieved, ("eligible organization", "organization types"))
        allowed_categories, category_source = self._extract_allowed_values(retrieved, ("project categories", "acceptable project"))
        required_docs, docs_source = self._extract_required_documents(retrieved)
        evidence_chunks = [
            {
                "source": item.get("source"),
                "scheme": item.get("scheme"),
                "chunk_id": item.get("chunk_id"),
                "score": item.get("score"),
                "text_excerpt": str(item.get("text", ""))[:400],
            }
            for item in retrieved
        ]

        results: list[ValidationResult] = [
            self._result(
                application_id,
                "SCHEME_KNOWLEDGE_RETRIEVAL",
                "PASS",
                "Scheme knowledge retrieved and used for guideline validation.",
                "INFO",
                {"scheme_id": scheme.id, "query": query, "chunks": evidence_chunks},
                check_id="RAG_RETRIEVAL",
                confidence=self._retrieval_confidence(retrieved),
            )
        ]

        if cost_limit is not None:
            cost = get_profile_value(profile, "financial.project_cost")
            results.append(
                self._compare_knowledge_numeric_limit(
                    db,
                    application_id,
                    "RAG_PROJECT_COST_LIMIT",
                    "financial.project_cost",
                    cost,
                    cost_limit,
                    "Project cost exceeds the retrieved scheme guideline limit.",
                    "Project cost is within the retrieved scheme guideline limit.",
                    cost_source,
                    query,
                )
            )

        if duration_limit is not None:
            duration = get_profile_value(profile, "timeline.duration_months")
            results.append(
                self._compare_knowledge_numeric_limit(
                    db,
                    application_id,
                    "RAG_PROJECT_DURATION_LIMIT",
                    "timeline.duration_months",
                    duration,
                    duration_limit,
                    "Project duration exceeds the retrieved scheme guideline limit.",
                    "Project duration is within the retrieved scheme guideline limit.",
                    duration_source,
                    query,
                )
            )

        if allowed_orgs:
            org_type = get_profile_value(profile, "applicant.organization_type")
            results.append(
                self._compare_knowledge_in_set(
                    application_id,
                    "RAG_ORGANIZATION_ELIGIBILITY",
                    "applicant.organization_type",
                    org_type,
                    allowed_orgs,
                    org_source,
                    query,
                )
            )

        if allowed_categories:
            category = get_profile_value(profile, "project.category")
            results.append(
                self._compare_knowledge_in_set(
                    application_id,
                    "RAG_PROJECT_CATEGORY_ELIGIBILITY",
                    "project.category",
                    category,
                    allowed_categories,
                    category_source,
                    query,
                )
            )

        if required_docs:
            present_docs = sorted({document.document_type for document in db.scalars(select(Document).where(Document.application_id == application_id)).all()})
            missing = sorted(set(required_docs) - set(present_docs))
            results.append(
                self._result(
                    application_id,
                    "RAG_REQUIRED_DOCUMENTS",
                    "PASS" if not missing else "FAIL",
                    "Required documents match retrieved scheme guidance." if not missing else "Required documents are missing according to retrieved scheme guidance.",
                    "INFO" if not missing else "ERROR",
                    {
                        "query": query,
                        "retrieved_source": docs_source.get("source"),
                        "relevance_score": docs_source.get("score"),
                        "extracted_guideline": {"required_documents": required_docs},
                        "applied_field": "documents.document_type",
                        "actual_value": present_docs,
                        "missing": missing,
                    },
                    check_id="RAG_REQUIRED_DOCUMENTS",
                    expected={"required_documents": required_docs},
                    actual={"present_documents": present_docs, "missing_documents": missing},
                    confidence=self._source_confidence(docs_source),
                    evidence_items=[self._knowledge_evidence_item(docs_source)],
                )
            )

        if len(results) == 1:
            results.append(
                self._result(
                    application_id,
                    "RAG_SCHEME_VALIDATION",
                    "NOT_CHECKED",
                    "Scheme knowledge was retrieved, but no machine-readable limit was found.",
                    "WARNING",
                    {"scheme_id": scheme.id, "chunks": evidence_chunks},
                    check_id="RAG_NO_MACHINE_READABLE_GUIDELINE",
                    confidence=0.0,
                )
            )

        audit_service.record(
            db,
            "RAG_VALIDATION_COMPLETED",
            application_id=application_id,
            actor_id="SYSTEM",
            payload={
                "stage": "VALIDATE",
                "validator": "rag",
                "checks": len(results),
                "failures": sum(1 for result in results if result.status == "FAIL"),
                "version": VALIDATION_VERSION,
            },
        )
        return results

    def _extract_cost_limit(self, retrieved: list[dict[str, Any]]) -> tuple[float | None, dict[str, Any]]:
        for item in retrieved:
            text = str(item.get("text", ""))
            for pattern in MONEY_LIMIT_PATTERNS:
                match = pattern.search(text)
                if match:
                    return _money_to_number(match.group(1), match.group(2)), item
        return None, {}

    def _extract_duration_limit(self, retrieved: list[dict[str, Any]]) -> tuple[float | None, dict[str, Any]]:
        for item in retrieved:
            text = str(item.get("text", ""))
            for pattern in DURATION_LIMIT_PATTERNS:
                match = pattern.search(text)
                if match:
                    return float(match.group(1)), item
        return None, {}

    def _extract_allowed_values(
        self,
        retrieved: list[dict[str, Any]],
        heading_terms: tuple[str, ...],
    ) -> tuple[list[str], dict[str, Any]]:
        for item in retrieved:
            text = str(item.get("text", ""))
            lower = text.lower()
            if not any(term in lower for term in heading_terms):
                continue
            values: list[str] = []
            for line in text.splitlines():
                clean = line.strip()
                if not clean.startswith("-"):
                    continue
                clean = clean.lstrip("- ").strip()
                clean = re.sub(r"\*\*", "", clean)
                clean = re.split(r"\s+[—-]\s+|\s+\(", clean, maxsplit=1)[0].strip()
                if 2 <= len(clean) <= 80:
                    values.append(clean)
            if values:
                return sorted(set(values)), item
        return [], {}

    def _extract_required_documents(self, retrieved: list[dict[str, Any]]) -> tuple[list[str], dict[str, Any]]:
        allowed_types = {"APPLICATION_FORM", "PROPOSAL", "BUDGET", "CERTIFICATE", "REPORT", "TIMELINE"}
        for item in retrieved:
            text = str(item.get("text", ""))
            if "required document" not in text.lower() and "document type" not in text.lower():
                continue
            found = sorted(set(re.findall(r"\b[A-Z][A-Z_]{3,}\b", text)) & allowed_types)
            if found:
                return found, item
        return [], {}

    def _retrieval_confidence(self, retrieved: list[dict[str, Any]]) -> float:
        if not retrieved:
            return 0.0
        return max(self._source_confidence(item) for item in retrieved)

    def _source_confidence(self, source: dict[str, Any]) -> float:
        raw_score = source.get("score")
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            return 0.65 if source else 0.0
        if score <= 1:
            return round(max(0.0, min(1.0, 1.0 - score)), 3)
        return round(max(0.0, min(1.0, score)), 3)

    def _knowledge_evidence_item(self, source: dict[str, Any]) -> dict[str, Any]:
        return {
            "source": source.get("source"),
            "scheme": source.get("scheme"),
            "chunk_id": source.get("chunk_id"),
            "relevance_score": source.get("score"),
            "text_excerpt": str(source.get("text", ""))[:500],
        }

    def _compare_knowledge_numeric_limit(
        self,
        db: Session,
        application_id: str,
        validation_type: str,
        field: str,
        actual: Any,
        expected_max: float,
        fail_message: str,
        pass_message: str,
        source: dict[str, Any],
        query: str,
    ) -> ValidationResult:
        evidence = {
            "query": query,
            "field": field,
            "applied_field": field,
            "expected_max": expected_max,
            "retrieved_limit": expected_max,
            "actual": actual,
            "actual_value": actual,
            "retrieved_source": source.get("source"),
            "relevance_score": source.get("score"),
            "extracted_guideline": {"maximum": expected_max},
            "knowledge_source": {
                "source": source.get("source"),
                "scheme": source.get("scheme"),
                "chunk_id": source.get("chunk_id"),
                "score": source.get("score"),
                "text_excerpt": str(source.get("text", ""))[:500],
            },
            "terminology": "Potential policy inconsistency; requires reviewer verification.",
        }
        try:
            actual_number = float(actual)
        except (TypeError, ValueError):
            return self._result(
                application_id,
                validation_type,
                "WARN",
                f"{field} could not be compared with the retrieved scheme guideline.",
                "WARNING",
                evidence,
                check_id=validation_type,
                confidence=0.0,
                expected={"field": field, "max": expected_max},
                actual={"field": field, "value": actual},
                evidence_items=[self._knowledge_evidence_item(source)],
            )

        evidence["actual"] = actual_number
        evidence["actual_value"] = actual_number
        confidence = self._source_confidence(source)
        if actual_number <= expected_max:
            return self._result(
                application_id,
                validation_type,
                "PASS",
                pass_message,
                "INFO",
                evidence,
                check_id=validation_type,
                confidence=confidence,
                expected={"field": field, "max": expected_max},
                actual={"field": field, "value": actual_number},
                evidence_items=[self._knowledge_evidence_item(source)],
            )

        db.add(
            Evidence(
                application_id=application_id,
                document_id=None,
                finding_type=validation_type,
                source=str(source.get("source") or "scheme_knowledge"),
                locator=str(source.get("chunk_id") or "retrieved_chunk"),
                field_name=field,
                extracted_value=str(actual_number),
                confidence=confidence,
                metadata_json=evidence,
            )
        )
        return self._result(
            application_id,
            validation_type,
            "FAIL",
            fail_message,
            "ERROR",
            evidence,
            check_id=validation_type,
            confidence=confidence,
            expected={"field": field, "max": expected_max},
            actual={"field": field, "value": actual_number},
            evidence_items=[self._knowledge_evidence_item(source)],
        )

    def _compare_knowledge_in_set(
        self,
        application_id: str,
        validation_type: str,
        field: str,
        actual: Any,
        allowed_values: list[str],
        source: dict[str, Any],
        query: str,
    ) -> ValidationResult:
        normalized_allowed = {value.casefold(): value for value in allowed_values}
        normalized_actual = str(actual or "").strip().casefold()
        if not actual:
            status = "NOT_CHECKED"
            message = f"{field} is missing; RAG eligibility comparison could not run."
            severity = "WARNING"
        elif normalized_actual in normalized_allowed:
            status = "PASS"
            message = f"{field} matches retrieved scheme eligibility guidance."
            severity = "INFO"
        else:
            status = "FAIL"
            message = f"{field} does not match retrieved scheme eligibility guidance."
            severity = "ERROR"
        evidence = {
            "query": query,
            "retrieved_source": source.get("source"),
            "relevance_score": source.get("score"),
            "extracted_guideline": {"allowed_values": allowed_values},
            "applied_field": field,
            "actual_value": actual,
        }
        return self._result(
            application_id,
            validation_type,
            status,
            message,
            severity,
            evidence,
            check_id=validation_type,
            confidence=self._source_confidence(source) if status != "NOT_CHECKED" else 0.0,
            expected={"field": field, "allowed_values": allowed_values},
            actual={"field": field, "value": actual},
            evidence_items=[self._knowledge_evidence_item(source)],
        )

    def _cross_document_consistency(
        self, db: Session, application_id: str, profile: dict[str, Any]
    ) -> list[ValidationResult]:
        fields = {
            "applicant.name": ("applicant_name", "text"),
            "applicant.organization_type": ("organization_type", "text"),
            "project.title": ("project_title", "text"),
            "project.category": ("project_category", "text"),
            "financial.project_cost": ("project_cost", "numeric"),
            "timeline.duration_months": ("duration_months", "numeric"),
        }
        results: list[ValidationResult] = []
        for profile_path, (field_name, compare_type) in fields.items():
            values = self._raw_values_for(profile, profile_path)
            by_source = [
                item for item in values
                if item.get("document_id") and item.get("value") not in (None, "")
            ]
            if len(by_source) < 2:
                results.append(
                    self._result(
                        application_id,
                        "CROSS_DOCUMENT_CONSISTENCY",
                        "NOT_CHECKED",
                        f"{profile_path} did not have multiple document-derived values to compare.",
                        "INFO",
                        {"field": profile_path, "values": by_source},
                        check_id=f"CROSS_DOCUMENT_{field_name.upper()}",
                        confidence=0.0,
                    )
                )
                continue

            contradiction, payload = self._compare_source_values(profile_path, by_source, compare_type)
            if not contradiction:
                results.append(
                    self._result(
                        application_id,
                        "CROSS_DOCUMENT_CONSISTENCY",
                        "PASS",
                        f"{profile_path} is consistent across submitted documents.",
                        "INFO",
                        payload,
                        check_id=f"CROSS_DOCUMENT_{field_name.upper()}",
                        confidence=1.0,
                        actual={"values": payload.get("values", [])},
                        evidence_items=payload.get("documents", []),
                        source_documents=[str(item.get("document_id")) for item in by_source],
                    )
                )
                continue

            high_item = payload.get("max_item") or by_source[-1]
            db.add(
                Evidence(
                    application_id=application_id,
                    document_id=high_item.get("document_id"),
                    finding_type="CROSS_DOCUMENT_CONTRADICTION",
                    source=high_item.get("filename") or "unknown",
                    locator=high_item.get("locator"),
                    field_name=profile_path,
                    extracted_value=str(high_item.get("value")),
                    confidence=float(high_item.get("confidence") or 1.0),
                    metadata_json={
                        **payload,
                        "terminology": "Potential inconsistency; requires review.",
                    },
                )
            )
            audit_service.record(
                db,
                "CROSS_DOCUMENT_CONTRADICTION_DETECTED",
                application_id=application_id,
                actor_id="SYSTEM",
                payload={"field": profile_path, "check_id": f"CROSS_DOCUMENT_{field_name.upper()}"},
            )
            results.append(
                self._result(
                    application_id,
                    "CROSS_DOCUMENT_CONSISTENCY",
                    "FAIL",
                    f"CONTRADICTION DETECTED: {profile_path} differs across submitted documents.",
                    "ERROR",
                    payload,
                    check_id=f"CROSS_DOCUMENT_{field_name.upper()}",
                    confidence=1.0,
                    actual={"values": payload.get("values", [])},
                    evidence_items=payload.get("documents", []),
                    source_documents=[str(item.get("document_id")) for item in by_source],
                )
            )
        return results

    def _raw_values_for(self, profile: dict[str, Any], dotted_path: str) -> list[dict[str, Any]]:
        current: Any = profile
        for part in dotted_path.split("."):
            if not isinstance(current, dict):
                return []
            current = current.get(part)
        if isinstance(current, dict):
            values = current.get("raw_values", [])
            return values if isinstance(values, list) else []
        return []

    def _compare_source_values(
        self,
        field: str,
        values: list[dict[str, Any]],
        compare_type: str,
    ) -> tuple[bool, dict[str, Any]]:
        documents = [
            {
                "document_id": item.get("document_id"),
                "filename": item.get("filename"),
                "locator": item.get("locator"),
                "value": item.get("value"),
                "confidence": item.get("confidence"),
            }
            for item in values
        ]
        payload = {
            "field": field,
            "documents": documents,
            "values": [item.get("value") for item in values],
            "status": "CONSISTENT",
            "severity": "INFO",
            "confidence": 1.0,
        }
        if compare_type == "numeric":
            numeric = []
            for item in values:
                try:
                    numeric.append((float(item["value"]), item))
                except (TypeError, ValueError):
                    continue
            if len(numeric) < 2:
                payload["status"] = "NOT_CHECKED"
                return False, payload
            low_value, low_item = min(numeric, key=lambda item: item[0])
            high_value, high_item = max(numeric, key=lambda item: item[0])
            settings = get_settings()
            tolerance = max(
                settings.contradiction_absolute_tolerance,
                abs(low_value) * settings.contradiction_relative_tolerance,
            )
            difference = high_value - low_value
            payload.update({"difference": difference, "tolerance": tolerance, "min_item": low_item, "max_item": high_item})
            if difference > tolerance:
                payload.update({"status": "CONTRADICTION", "severity": "ERROR"})
                return True, payload
            return False, payload

        normalized = {self._normalize_text_value(item.get("value")) for item in values}
        normalized.discard("")
        if len(normalized) > 1:
            payload.update({"status": "CONTRADICTION", "severity": "ERROR", "normalized_values": sorted(normalized)})
            return True, payload
        return False, payload

    def _normalize_text_value(self, value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "").strip().casefold())

    def _authenticity_indicators(
        self, application_id: str, documents: list[Document], profile: dict[str, Any]
    ) -> list[ValidationResult]:
        has_certificate = any(document.document_type == "CERTIFICATE" for document in documents)
        certificate_number = get_profile_value(profile, "certificates.certificate_number")
        if has_certificate and not certificate_number:
            return [
                self._result(
                    application_id,
                    "AUTHENTICITY_INDICATOR",
                    "WARN",
                    "Certificate document is present but no certificate number was extracted.",
                    "WARNING",
                )
            ]
        return [self._result(application_id, "AUTHENTICITY_INDICATOR", "PASS", "No certificate authenticity warning was detected.")]

    def _duplicate_detection(self, db: Session, application: Application) -> ValidationResult:
        duplicate_checksum = db.scalar(
            select(func.count(Document.id))
            .join(Application, Document.application_id == Application.id)
            .where(Application.id != application.id)
            .where(Document.checksum.in_(select(Document.checksum).where(Document.application_id == application.id)))
        )
        if duplicate_checksum and duplicate_checksum > 0:
            return self._result(
                application.id,
                "DUPLICATE_DETECTION",
                "WARN",
                "Potential duplicate document checksum found in another application.",
                "WARNING",
                {"duplicate_document_count": duplicate_checksum},
            )

        comparable = db.scalars(
            select(Application)
            .where(Application.id != application.id)
            .where(Application.applicant_name == application.applicant_name)
            .where(Application.project_title == application.project_title)
        ).all()
        if comparable:
            return self._result(
                application.id,
                "DUPLICATE_DETECTION",
                "WARN",
                "Potential duplicate application with same applicant and project title.",
                "WARNING",
                {"duplicate_application_ids": [item.id for item in comparable]},
            )
        return self._result(application.id, "DUPLICATE_DETECTION", "PASS", "No duplicate application indicator was detected.")

    def _suspicious_indicators(self, application_id: str, profile: dict[str, Any]) -> ValidationResult:
        cost = get_profile_value(profile, "financial.project_cost")
        confidence = profile.get("extraction_metadata", {}).get("average_confidence", 0.0)
        settings = get_settings()
        indicators: list[str] = []
        if confidence < 0.5:
            indicators.append("Low extraction confidence")
        try:
            if cost is not None and float(cost) > settings.suspicious_cost_threshold:
                indicators.append(
                    f"High claimed project cost (₹{float(cost):,.0f} exceeds threshold ₹{settings.suspicious_cost_threshold:,.0f})"
                )
        except (TypeError, ValueError):
            indicators.append("Project cost could not be interpreted")
        status = "WARN" if indicators else "PASS"
        return self._result(
            application_id,
            "SUSPICIOUS_INDICATOR",
            status,
            "Potential suspicious indicators require review." if indicators else "No suspicious indicator was detected.",
            "WARNING" if indicators else "INFO",
            {"indicators": indicators, "suspicious_cost_threshold": settings.suspicious_cost_threshold},
        )


validation_service = ValidationService()
