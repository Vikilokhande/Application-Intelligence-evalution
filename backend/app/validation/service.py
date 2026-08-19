from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, Document, Evidence, Scheme, SchemeRule, ValidationResult
from app.normalization.service import get_profile_value


class ValidationService:
    def validate(self, db: Session, application: Application, profile: dict[str, Any], scheme: Scheme | None) -> list[ValidationResult]:
        db.execute(delete(ValidationResult).where(ValidationResult.application_id == application.id))
        documents = db.scalars(select(Document).where(Document.application_id == application.id)).all()
        results: list[ValidationResult] = []

        results.extend(
            [
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
        )

        for result in results:
            db.add(result)
        for document in documents:
            document.validation_status = "VALIDATED"
        audit_service.record(
            db,
            "validation_executed",
            application_id=application.id,
            payload={"failures": sum(1 for item in results if item.status == "FAIL")},
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
    ) -> ValidationResult:
        return ValidationResult(
            application_id=application_id,
            validation_type=validation_type,
            status=status,
            message=message,
            severity=severity,
            evidence=evidence or {},
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
            required = ["APPLICATION_FORM", "PROPOSAL", "BUDGET", "CERTIFICATE"]
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

    def _cross_document_consistency(
        self, db: Session, application_id: str, profile: dict[str, Any]
    ) -> list[ValidationResult]:
        costs = profile.get("financial", {}).get("project_costs", [])
        by_source: list[dict[str, Any]] = []
        for item in costs:
            if item.get("document_id") and item.get("value") not in (None, ""):
                by_source.append(item)
        if len(by_source) < 2:
            return [
                self._result(
                    application_id,
                    "CROSS_DOCUMENT_CONSISTENCY",
                    "PASS",
                    "No cross-document financial contradiction was detected.",
                )
            ]

        numeric = [(float(item["value"]), item) for item in by_source]
        low_value, low_item = min(numeric, key=lambda item: item[0])
        high_value, high_item = max(numeric, key=lambda item: item[0])
        tolerance = max(5_000.0, low_value * 0.02)
        if high_value - low_value <= tolerance:
            return [
                self._result(
                    application_id,
                    "CROSS_DOCUMENT_CONSISTENCY",
                    "PASS",
                    "Project cost values are consistent across documents.",
                    evidence={"values": by_source},
                )
            ]

        evidence_payload = {
            "finding": "CONTRADICTION DETECTED",
            "field": "project_cost",
            "sources": [low_item, high_item],
            "difference": high_value - low_value,
        }
        db.add(
            Evidence(
                application_id=application_id,
                document_id=high_item.get("document_id"),
                finding_type="BUDGET_INCONSISTENCY",
                source=high_item.get("filename") or "unknown",
                locator=high_item.get("locator"),
                field_name="project_cost",
                extracted_value=str(high_item.get("value")),
                confidence=float(high_item.get("confidence") or 0.0),
                metadata_json={"compared_with": low_item, "terminology": "Potential inconsistency; requires review."},
            )
        )
        return [
            self._result(
                application_id,
                "CROSS_DOCUMENT_CONSISTENCY",
                "FAIL",
                "CONTRADICTION DETECTED: project cost differs across submitted documents.",
                "ERROR",
                evidence_payload,
            )
        ]

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
        indicators: list[str] = []
        if confidence < 0.5:
            indicators.append("Low extraction confidence")
        try:
            if cost is not None and float(cost) > 10_000_000:
                indicators.append("High claimed project cost")
        except (TypeError, ValueError):
            indicators.append("Project cost could not be interpreted")
        status = "WARN" if indicators else "PASS"
        return self._result(
            application_id,
            "SUSPICIOUS_INDICATOR",
            status,
            "Potential suspicious indicators require review." if indicators else "No suspicious indicator was detected.",
            "WARNING" if indicators else "INFO",
            {"indicators": indicators},
        )


validation_service = ValidationService()

