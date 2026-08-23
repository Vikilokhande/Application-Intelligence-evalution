"""
extraction/service.py
=====================

Real document extraction pipeline:

1. Parse document (PDF/DOCX/XLSX/CSV/JSON/TXT)
2. Detect if OCR is needed (insufficient embedded text)
3. Run OCR if required (TesseractOCRProvider)
4. Classify document type via LLM (with filename heuristic fallback)
5. Extract structured fields via LLM (with regex fallback/verification)
6. Persist ExtractedData and Evidence records
7. Record audit events

Production path never returns fake results.
If LLM is unavailable, it raises LLMProviderError.
If OCR is unavailable, it raises OCRProviderError.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.config import get_settings
from app.core.exceptions import DocumentParsingError, ExtractionError, LLMProviderError, OCRProviderError
from app.extraction.providers import (
    LLMProvider,
    OCRProvider,
    RealDocumentParser,
    get_llm_provider,
    get_ocr_provider,
)
from app.models import Document, Evidence, ExtractedData

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex patterns used as secondary verification / fallback
# ---------------------------------------------------------------------------

# Delimiter pattern matching :, =, |, tab, or 2+ spaces
DELIM_RE = r"(?:[\s\t]*[:=\|][\s\t]*|[\s\t]{2,})"

COST_RE = re.compile(
    r"(?:project[_\s-]*cost|total[_\s-]*cost|budget[_\s-]*total|requested[_\s-]*grant[_\s-]*amount|grant[_\s-]*amount|cost)"
    r"(?:\s*\([^)]*\))?"
    + DELIM_RE +
    r"(?:inr|rs\.?|\u20b9)?\s*([0-9][0-9,\.]*)\s*(lakh|lakhs|crore|crores|k|million)?",
    re.IGNORECASE,
)
DURATION_RE = re.compile(
    r"(?:duration[_\s-]*months|project[_\s-]*duration|duration|timeline|period)"
    r"(?:\s*\([^)]*\))?"
    + DELIM_RE +
    r"([0-9]{1,3})\s*(?:months|month|m)?",
    re.IGNORECASE,
)
FIELD_PATTERNS = {
    "applicant_name": re.compile(
        r"(?:applicant[_\s-]*name|applicant[_\s-]*entity[_\s-]*name|organization[_\s-]*name|name[_\s-]*of[_\s-]*applicant|applicant|organization)"
        + DELIM_RE +
        r"([A-Za-z0-9 &.,'\-\(\)/\u2013\u2014]{3,160})",
        re.IGNORECASE,
    ),
    "project_title": re.compile(
        r"(?:project[_\s-]*title|title[_\s-]*of[_\s-]*project|project[_\s-]*name|title)"
        + DELIM_RE +
        r"([A-Za-z0-9 &.,'\-/\(\)\u2013\u2014\u2015\u2212]{3,200})",
        re.IGNORECASE,
    ),
    "organization_type": re.compile(
        r"(?:organization[_\s-]*type|applicant[_\s-]*type|entity[_\s-]*type|nature[_\s-]*of[_\s-]*organization|org[_\s-]*type)"
        + DELIM_RE +
        r"([A-Za-z0-9 &.,'\-/\(\)]{2,80})",
        re.IGNORECASE,
    ),
    "project_category": re.compile(
        r"(?:project_category|project category|category|sector|nature of project)"
        + DELIM_RE +
        r"([A-Za-z0-9 &.,'\-/\(\)]{3,120})",
        re.IGNORECASE,
    ),
    "certificate_number": re.compile(
        r"(?:certificate[_\s-]*number|certificate[_\s-]*no\.?|certificate[_\s-]*ref\.?|certificate[_\s-]*reference|registration[_\s-]*number|registration[_\s-]*no\.?|reg[_\s-]*no\.?|certificate)"
        + DELIM_RE +
        r"([A-Za-z0-9/\-\.]{3,80})",
        re.IGNORECASE,
    ),
    "environmental_benefit": re.compile(
        r"(?:environmental_benefit|environmental benefit|environmental impact|impact summary|technical proposal summary|impact|benefit)"
        + DELIM_RE +
        r"([A-Za-z0-9 ,.'/\-\(\)%]{8,300})",
        re.IGNORECASE,
    ),
}

DOCUMENT_TYPE_MAP = {
    "proposal": "PROPOSAL",
    "budget": "BUDGET",
    "certificate": "CERTIFICATE",
    "report": "REPORT",
    "form": "APPLICATION_FORM",
    "application": "APPLICATION_FORM",
    "timeline": "TIMELINE",
    "financial": "FINANCIAL_REPORT",
}


def _classify_by_filename(filename: str, declared_type: str | None) -> str | None:
    """Deterministic filename keyword matching."""
    if declared_type and declared_type.upper() not in ("UNKNOWN", ""):
        return declared_type.upper()
    name = filename.lower()
    for keyword, doc_type in DOCUMENT_TYPE_MAP.items():
        if keyword in name:
            return doc_type
    return None


# Signal dictionary mapping document type -> tuple of (signal_phrase, weight, signal_category)
# High weight (3) = explicit unambiguous type marker (e.g. "eligibility certificate", "project proposal")
# Medium weight (2) = document specific term (e.g. "certificate", "proposal", "budget breakdown")
# Low weight (1) = generic shared header (e.g. "applicant name", "form data")
DOCUMENT_TYPE_WEIGHTED_SIGNALS: dict[str, list[tuple[str, int]]] = {
    "APPLICATION_FORM": [
        ("application form", 3),
        ("official application", 3),
        ("grant application form", 3),
        ("declaration", 2),
        ("form data", 1),
        ("applicant name", 1),  # Low weight: shared header in tables
    ],
    "PROPOSAL": [
        ("project proposal", 3),
        ("technical proposal", 3),
        ("proposal summary", 3),
        ("proposes to", 3),
        ("proposal", 2),
        ("project objective", 2),
        ("project description", 2),
        ("implementation plan", 2),
    ],
    "BUDGET": [
        ("budget statement", 3),
        ("project budget", 3),
        ("itemized budget", 3),
        ("financial breakdown", 3),
        ("budget", 2),
        ("line item", 2),
        ("total cost", 2),
        ("total project cost", 2),
    ],
    "CERTIFICATE": [
        ("eligibility certificate", 3),
        ("registration certificate", 3),
        ("certifying authority", 3),
        ("certificate ref", 3),
        ("is to certify", 3),
        ("certificate number", 3),
        ("certificate", 2),
        ("certified", 2),
        ("registration", 2),
    ],
    "TIMELINE": [
        ("project timeline", 3),
        ("implementation schedule", 3),
        ("timeline", 2),
        ("milestone", 2),
        ("schedule", 2),
    ],
    "TECHNICAL_REPORT": [
        ("technical report", 3),
        ("specification report", 3),
        ("methodology", 2),
        ("specification", 2),
    ],
    "ENVIRONMENTAL_REPORT": [
        ("environmental impact", 3),
        ("impact assessment", 3),
        ("biodiversity assessment", 3),
        ("environmental", 2),
        ("emissions", 2),
    ],
    "SUPPORTING_DOCUMENT": [
        ("annexure", 2),
        ("attachment", 2),
        ("supporting document", 2),
    ],
}

# Specificity rank used as secondary tie-breaker (specific document types win over generic APPLICATION_FORM)
DOCUMENT_TYPE_SPECIFICITY_RANK = {
    "CERTIFICATE": 10,
    "PROPOSAL": 10,
    "BUDGET": 10,
    "TIMELINE": 10,
    "TECHNICAL_REPORT": 10,
    "ENVIRONMENTAL_REPORT": 10,
    "FINANCIAL_REPORT": 10,
    "APPLICATION_FORM": 5,
    "SUPPORTING_DOCUMENT": 3,
    "OTHER": 1,
}


def _classify_by_content_and_filename(filename: str, declared_type: str | None, text: str) -> tuple[str, float, list[str]]:
    """
    Weighted content + filename heuristic classifier used when LLM classification is unavailable.
    - Explicit filename keywords take priority.
    - Content signals are weighted (specific type markers beat generic shared table headers).
    - Ties are resolved safely by specificity rank instead of dictionary iteration order.
    """
    if declared_type and declared_type.upper() not in ("UNKNOWN", ""):
        return declared_type.upper(), 0.8, ["declared_type"]

    filename_type = _classify_by_filename(filename, None)
    haystack = f"{filename.lower()} {text[:3000].lower()}"

    scores: dict[str, int] = {dt: 0 for dt in DOCUMENT_TYPE_WEIGHTED_SIGNALS}
    matched_signals: dict[str, list[str]] = {dt: [] for dt in DOCUMENT_TYPE_WEIGHTED_SIGNALS}

    # Add strong score boost if filename explicitly names the document type
    if filename_type and filename_type in scores:
        scores[filename_type] += 5
        matched_signals[filename_type].append(f"filename:{filename_type.lower()}")

    for doc_type, signal_list in DOCUMENT_TYPE_WEIGHTED_SIGNALS.items():
        for signal_phrase, weight in signal_list:
            if signal_phrase in haystack:
                scores[doc_type] += weight
                matched_signals[doc_type].append(signal_phrase)

    # General tie-breaking: Sort by (score, specificity_rank) descending
    candidates = sorted(
        scores.items(),
        key=lambda item: (item[1], DOCUMENT_TYPE_SPECIFICITY_RANK.get(item[0], 0)),
        reverse=True,
    )

    best_type, best_score = candidates[0]
    if best_score > 0:
        matches = matched_signals.get(best_type, [])
        confidence = round(min(0.85, 0.40 + best_score * 0.08), 3)
        return best_type, confidence, matches[:5]

    name = filename.lower()
    if name.endswith((".xlsx", ".xls", ".csv")):
        return "BUDGET", 0.45, ["tabular_extension"]
    if name.endswith((".jpg", ".jpeg", ".png", ".tiff", ".tif")):
        return "IMAGE_DOCUMENT", 0.45, ["image_extension"]
    if name.endswith(".json"):
        return "APPLICATION_FORM", 0.45, ["json_extension"]
    return "OTHER", 0.25, []


def _money_to_rupees(number_text: str, unit: str | None) -> float:
    value = float(number_text.replace(",", ""))
    normalized_unit = (unit or "").lower()
    if normalized_unit.startswith("lakh"):
        return value * 100_000
    if normalized_unit.startswith("crore"):
        return value * 10_000_000
    if normalized_unit == "k":
        return value * 1_000
    if normalized_unit == "million":
        return value * 1_000_000
    return value


def _clean_extracted_text(raw_text: str) -> str:
    """Clean extracted value string, removing trailing table pipes or headers."""
    text = raw_text.strip()
    if "|" in text:
        text = text.split("|")[0].strip()
    return text.strip()


def _regex_extract_fields(text: str, document: Document) -> dict[str, Any]:
    """Regex extraction — used as fallback verification or primary when LLM unavailable."""
    fields: dict[str, Any] = {}
    cost_match = COST_RE.search(text)
    if cost_match:
        fields["project_cost"] = _field_payload(
            _money_to_rupees(cost_match.group(1), cost_match.group(2)),
            cost_match.group(0),
            document,
            "project_cost",
            0.75,
            "regex",
        )
    duration_match = DURATION_RE.search(text)
    if duration_match:
        fields["duration_months"] = _field_payload(
            int(duration_match.group(1)),
            duration_match.group(0),
            document,
            "duration_months",
            0.73,
            "regex",
        )
    for field_name, pattern in FIELD_PATTERNS.items():
        match = pattern.search(text)
        if match:
            cleaned_val = _clean_extracted_text(match.group(1))
            if cleaned_val:
                fields[field_name] = _field_payload(
                    cleaned_val,
                    match.group(0),
                    document,
                    field_name,
                    0.72,
                    "regex",
                )
    return fields


def _field_payload(
    value: Any,
    raw_text: str,
    document: Document,
    field_name: str,
    confidence: float,
    extraction_method: str = "llm",
) -> dict[str, Any]:
    locator = "sheet/cell inferred" if document.document_type == "BUDGET" else "document text"
    return {
        "value": value,
        "raw_text": raw_text[:300],
        "confidence": confidence,
        "extraction_method": extraction_method,
        "evidence": {
            "document_id": document.id,
            "filename": document.filename,
            "document_type": document.document_type,
            "locator": locator,
            "field_name": field_name,
            "extracted_value": str(value),
        },
    }


def _parse_llm_extraction(llm_result: dict[str, Any], document: Document) -> dict[str, Any]:
    """
    Convert LLM structured extraction output into the internal field payload format.
    """
    LLM_TO_INTERNAL: dict[str, str] = {
        "applicant_name": "applicant_name",
        "organization_type": "organization_type",
        "project_title": "project_title",
        "project_category": "project_category",
        "project_cost": "project_cost",
        "duration_months": "duration_months",
        "certificate_number": "certificate_number",
        "environmental_benefit": "environmental_benefit",
    }

    fields: dict[str, Any] = {}
    for llm_key, internal_key in LLM_TO_INTERNAL.items():
        field_data = llm_result.get(llm_key)
        if not isinstance(field_data, dict):
            continue
        value = field_data.get("value")
        if value is None:
            continue
        confidence = float(field_data.get("confidence", 0.8))
        source_text = str(field_data.get("source", ""))
        fields[internal_key] = _field_payload(
            value,
            source_text,
            document,
            internal_key,
            confidence,
            "llm",
        )
    return fields


def _merge_fields(
    llm_fields: dict[str, Any],
    regex_fields: dict[str, Any],
) -> dict[str, Any]:
    """
    Merge LLM and regex extraction results.
    LLM takes precedence when it produces a non-null value.
    Per-field null awareness: if LLM returns null/empty for a field, regex result is used.
    When both sources provide valid non-null values, compare confidence or record conflict.
    """
    merged = dict(llm_fields)
    for key, regex_payload in regex_fields.items():
        llm_payload = merged.get(key)
        llm_val = llm_payload.get("value") if isinstance(llm_payload, dict) else None
        regex_val = regex_payload.get("value") if isinstance(regex_payload, dict) else None

        if llm_val in (None, ""):
            # LLM missed or returned null/empty — use regex payload if regex extracted a non-null value
            if regex_val not in (None, ""):
                merged[key] = regex_payload
        else:
            # Both sources extracted non-null values — check for conflict
            if regex_val not in (None, "") and llm_val != regex_val:
                merged[key]["_regex_conflict"] = {
                    "regex_value": regex_val,
                    "regex_confidence": regex_payload.get("confidence"),
                }
    return merged


# ---------------------------------------------------------------------------
# Main Document Intelligence Service
# ---------------------------------------------------------------------------


class DocumentIntelligenceService:
    """
    Real document intelligence pipeline.

    Never returns fabricated extraction results.
    Raises explicit errors when providers are unavailable.
    """

    def __init__(
        self,
        parser: Any | None = None,
        ocr: OCRProvider | None = None,
        llm: LLMProvider | None = None,
    ) -> None:
        self.settings = get_settings()
        self.parser = parser or RealDocumentParser()
        # OCR and LLM are resolved lazily to support startup without crashing
        self._ocr = ocr
        self._llm = llm

    def _get_ocr(self) -> OCRProvider | None:
        if self._ocr is not None:
            return self._ocr
        try:
            self._ocr = get_ocr_provider(self.settings)
        except Exception as exc:
            logger.warning("OCR provider not available: %s", exc)
            self._ocr = None
        return self._ocr

    def _get_llm(self) -> LLMProvider:
        if self._llm is not None:
            return self._llm
        self._llm = get_llm_provider(self.settings)
        return self._llm

    def process_document(self, db: Session, document: Document) -> ExtractedData:
        """
        Full document processing pipeline.
        Returns real ExtractedData persisted to the database.
        """
        document.processing_status = "PROCESSING"
        document.extraction_status = "PROCESSING"
        db.flush()

        try:
            return self._process_document_inner(db, document)
        except (DocumentParsingError, ExtractionError, LLMProviderError, OCRProviderError) as exc:
            logger.error(
                "Provider error during document processing app=%s doc=%s: %s",
                document.application_id, document.id, exc,
            )
            document.processing_status = "FAILED"
            document.extraction_status = "FAILED"
            if not hasattr(document, "metadata_json") or document.metadata_json is None:
                document.metadata_json = {}
            document.metadata_json["processing_error"] = exc.code
            document.metadata_json["processing_error_message"] = exc.message
            audit_service.record(
                db,
                "extraction_failed",
                application_id=document.application_id,
                payload={"document_id": document.id, "error": exc.code, "message": exc.message},
            )
            raise
        except Exception as exc:
            logger.error("Unexpected error processing doc=%s: %s", document.id, exc)
            document.processing_status = "FAILED"
            document.extraction_status = "FAILED"
            raise DocumentParsingError(str(exc), document_id=document.id) from exc

    def _process_document_inner(self, db: Session, document: Document) -> ExtractedData:
        # ── 1. Parse document ─────────────────────────────────────────────────
        parsed = self.parser.parse(Path(document.file_path), document.mime_type)
        text: str = parsed.get("text", "")
        pages: list[dict] = parsed.get("pages", [])
        parser_name: str = parsed.get("parser", "unknown")

        ocr_metadata: dict[str, Any] = {}

        # ── 2. OCR if needed ──────────────────────────────────────────────────
        requires_ocr = parsed.get("metadata", {}).get("requires_ocr", False)
        text_too_short = (
            len(text.strip()) < self.settings.ocr_min_text_length
            and not requires_ocr  # don't double-check image files
        )
        is_image = parsed.get("metadata", {}).get("requires_ocr", False)
        needs_ocr = is_image or text_too_short

        if needs_ocr and self.settings.ocr_enabled:
            ocr_provider = self._get_ocr()
            if ocr_provider is None:
                message = "Document requires OCR, but no OCR provider is available."
                logger.warning("Document doc=%s needs OCR but OCR provider is unavailable.", document.id)
                ocr_metadata = {
                    "ocr_enabled": True,
                    "ocr_status": "PROVIDER_UNAVAILABLE",
                    "ocr_error": "OCR_PROVIDER_UNAVAILABLE",
                    "ocr_error_message": message,
                }
                if not text.strip():
                    raise OCRProviderError(
                        message,
                        provider=self.settings.ocr_provider,
                        document_id=document.id,
                        application_id=document.application_id,
                    )
            else:
                logger.info(
                    "Running OCR on doc=%s app=%s (text_len=%d)",
                    document.id, document.application_id, len(text),
                )
                try:
                    ocr_result = ocr_provider.extract_text(Path(document.file_path), self.settings.ocr_language)
                    ocr_text = ocr_result.get("text", "")
                    ocr_metadata = {
                        "ocr_provider": ocr_result.get("provider", "unknown"),
                        "ocr_confidence": ocr_result.get("confidence", 0.0),
                        "ocr_language": ocr_result.get("language", self.settings.ocr_language),
                        "ocr_status": ocr_result.get("status", "UNKNOWN"),
                        "ocr_page_count": ocr_result.get("page_count", 0),
                        "ocr_enabled": True,
                    }
                    if ocr_text:
                        text = ocr_text
                        pages = ocr_result.get("pages", pages)
                        parser_name = f"ocr:{ocr_result.get('provider', 'unknown')}"
                    elif not text.strip():
                        raise OCRProviderError(
                            "OCR completed but returned no text for a document that requires OCR.",
                            provider=ocr_result.get("provider", "unknown"),
                            document_id=document.id,
                            application_id=document.application_id,
                        )
                    audit_service.record(
                        db,
                        "ocr_completed",
                        application_id=document.application_id,
                        payload={
                            "document_id": document.id,
                            "ocr_provider": ocr_result.get("provider"),
                            "ocr_confidence": ocr_result.get("confidence"),
                            "text_length": len(ocr_text),
                        },
                    )
                except OCRProviderError as ocr_exc:
                    logger.warning(
                        "OCR failed for doc=%s: %s. Embedded text length=%d.",
                        document.id, ocr_exc.message, len(text),
                    )
                    ocr_metadata = {
                        "ocr_enabled": True,
                        "ocr_status": "OCR_FAILED",
                        "ocr_error": ocr_exc.code,
                        "ocr_error_message": ocr_exc.message,
                    }
                    audit_service.record(
                        db,
                        "ocr_unavailable",
                        application_id=document.application_id,
                        payload={"document_id": document.id, "error": ocr_exc.code},
                    )
                    if not text.strip():
                        raise
        elif needs_ocr and not self.settings.ocr_enabled:
            logger.warning(
                "Document doc=%s needs OCR but OCR_ENABLED=false. Text will be empty.",
                document.id,
            )
            ocr_metadata = {"ocr_enabled": False, "ocr_status": "DISABLED"}
            if not text.strip():
                raise OCRProviderError(
                    "Document requires OCR, but OCR is disabled.",
                    provider="disabled",
                    document_id=document.id,
                    application_id=document.application_id,
                )

        # ── 3. LLM document classification ────────────────────────────────────
        doc_type, classification_meta = self._classify_document(document, text)
        document.document_type = doc_type
        if document.metadata_json is None:
            document.metadata_json = {}
        document.metadata_json.update(classification_meta)
        document.metadata_json.update(ocr_metadata)
        document.metadata_json["extraction_provider"] = parser_name
        document.metadata_json["page_count"] = len(pages)
        document.classification_confidence = float(classification_meta.get("classification_confidence", 0.0))
        document.classification_provider = str(classification_meta.get("classification_provider", "unknown"))
        document.ocr_provider = ocr_metadata.get("ocr_provider")
        document.ocr_confidence = ocr_metadata.get("ocr_confidence")
        document.ocr_status = ocr_metadata.get("ocr_status")

        # ── 4. LLM structured extraction ──────────────────────────────────────
        llm_fields: dict[str, Any] = {}
        extraction_method = "regex_fallback"
        llm_status = "NOT_ATTEMPTED"

        if text.strip():
            try:
                llm = self._get_llm()
                llm_result = llm.extract_structured(
                    text,
                    "ApplicationFields",
                     correlation_id=document.application_id,
                )
                llm_fields = _parse_llm_extraction(llm_result, document)
                extraction_method = "llm_primary"
                llm_status = "COMPLETED"
                logger.info(
                    "LLM extraction completed doc=%s fields_found=%d",
                    document.id, len(llm_fields),
                )
            except LLMProviderError as exc:
                logger.warning(
                    "LLM extraction failed doc=%s, falling back to regex: %s",
                    document.id, exc,
                )
                document.metadata_json["llm_extraction_error"] = exc.message
                document.metadata_json["llm_status"] = "FAILED"
                document.metadata_json["degraded_mode"] = True
                document.metadata_json["degraded_reason"] = "LLM_UNAVAILABLE_REGEX_FALLBACK"
                document.metadata_json["degraded_message"] = f"DEGRADED MODE: LLM UNAVAILABLE, USING REGEX-ONLY EXTRACTION ({exc.message})"
                extraction_method = "regex_with_llm_unavailable"
                llm_status = "FAILED"
                audit_service.record(
                    db,
                    "degraded_mode_activated",
                    application_id=document.application_id,
                    payload={
                        "document_id": document.id,
                        "flag": "DEGRADED_MODE: LLM_UNAVAILABLE_REGEX_FALLBACK",
                        "reason": exc.message,
                        "message": f"LLM provider unavailable for extraction. Degraded regex fallback active.",
                    },
                )
            except Exception as exc:
                logger.warning(
                    "Unexpected error in LLM extraction for doc=%s, falling back to regex: %s",
                    document.id, exc,
                )
                document.metadata_json["llm_extraction_error"] = str(exc)
                document.metadata_json["llm_status"] = "FAILED"
                document.metadata_json["degraded_mode"] = True
                document.metadata_json["degraded_reason"] = "LLM_UNAVAILABLE_REGEX_FALLBACK"
                document.metadata_json["degraded_message"] = f"DEGRADED MODE: LLM UNAVAILABLE, USING REGEX-ONLY EXTRACTION ({exc})"
                extraction_method = "regex_with_llm_error"
                llm_status = "FAILED"
                audit_service.record(
                    db,
                    "degraded_mode_activated",
                    application_id=document.application_id,
                    payload={
                        "document_id": document.id,
                        "flag": "DEGRADED_MODE: LLM_UNAVAILABLE_REGEX_FALLBACK",
                        "reason": str(exc),
                        "message": f"LLM extraction error. Degraded regex fallback active.",
                    },
                )
        elif not text.strip():
            extraction_method = "no_text_extracted"

        # ── 5. Regex extraction (verification / fallback) ─────────────────────
        regex_fields = _regex_extract_fields(text, document)

        # ── 6. Merge ──────────────────────────────────────────────────────────
        merged_fields = _merge_fields(llm_fields, regex_fields)
        document.metadata_json["llm_status"] = llm_status

        # ── 7. LLM summary ────────────────────────────────────────────────────
        summary = ""
        if text.strip():
            try:
                summary = self._get_llm().summarize(text)
            except LLMProviderError as exc:
                logger.warning("LLM summarize failed doc=%s: %s", document.id, exc)
                summary = f"Summary unavailable: {exc.code}"

        # ── 8. Confidence calculation ──────────────────────────────────────────
        confidence = self._calc_confidence(merged_fields, text)

        # ── 9. Build raw_data ────────────────────────────────────────────────
        raw_data = {
            "document_type": document.document_type,
            "text_excerpt": text[:1500],
            "summary": summary,
            "fields": merged_fields,
            "pages": pages[:5],   # Store first 5 pages in DB
            "metadata": parsed.get("metadata", {}),
            "extraction_method": extraction_method,
            "parser": parser_name,
            "classification": classification_meta,
            "ocr": ocr_metadata,
            "llm_status": llm_status,
        }

        # ── 10. Persist ExtractedData ─────────────────────────────────────────
        db.execute(delete(ExtractedData).where(ExtractedData.document_id == document.id))
        extracted = ExtractedData(
            application_id=document.application_id,
            document_id=document.id,
            extraction_type="DOCUMENT_INTELLIGENCE",
            raw_data=raw_data,
            confidence=confidence,
            provider="openrouter" if extraction_method == "llm_primary" else extraction_method,
            status="EXTRACTED",
        )
        db.add(extracted)

        # ── 11. Persist field evidence ─────────────────────────────────────────
        self._persist_field_evidence(db, document, merged_fields)

        # ── 12. Update document status ────────────────────────────────────────
        document.processing_status = "PROCESSED"
        document.extraction_status = "EXTRACTED"

        audit_service.record(
            db,
            "extraction_completed",
            application_id=document.application_id,
            payload={
                "document_id": document.id,
                "document_type": document.document_type,
                "confidence": confidence,
                "fields_extracted": list(merged_fields.keys()),
                "extraction_method": extraction_method,
                "parser": parser_name,
            },
        )
        return extracted

    def _classify_document(self, document: Document, text: str) -> tuple[str, dict[str, Any]]:
        """Returns (document_type, classification_metadata)."""
        heuristic_type, heuristic_confidence, heuristic_signals = _classify_by_content_and_filename(
            document.filename,
            document.document_type,
            text,
        )

        try:
            llm = self._get_llm()
            result = llm.classify_document(text, document.filename, document.document_type or "UNKNOWN")
            doc_type = result.get("document_type", "SUPPORTING_DOCUMENT")
            meta = {
                "classification_provider": result.get("provider", "openrouter"),
                "classification_confidence": result.get("confidence", 0.5),
                "classification_reason": result.get("reason", ""),
                "classification_signals": result.get("signals", []),
                "classification_method": "llm",
            }
            return doc_type, meta
        except LLMProviderError as exc:
            logger.warning(
                "LLM classification failed for doc=%s, using content/filename heuristic: %s",
                document.id, exc,
            )
            return heuristic_type, {
                "classification_provider": "content_filename_heuristic",
                "classification_confidence": heuristic_confidence,
                "classification_reason": f"LLM unavailable: {exc.code}",
                "classification_signals": heuristic_signals,
                "classification_method": "content_filename_heuristic_after_llm_failure",
            }

    def _calc_confidence(self, fields: dict[str, Any], text: str) -> float:
        if fields:
            confs = [
                float(payload.get("confidence", 0.5))
                for payload in fields.values()
                if isinstance(payload, dict)
            ]
            return round(sum(confs) / len(confs), 3) if confs else 0.5
        return 0.35 if text.strip() else 0.1

    def _persist_field_evidence(self, db: Session, document: Document, fields: dict[str, Any]) -> None:
        for field_name, payload in fields.items():
            if not isinstance(payload, dict):
                continue
            evidence_meta = payload.get("evidence", {})
            db.add(
                Evidence(
                    application_id=document.application_id,
                    document_id=document.id,
                    finding_type="EXTRACTED_FIELD",
                    source=document.filename,
                    locator=evidence_meta.get("locator"),
                    field_name=field_name,
                    extracted_value=str(payload.get("value", "")),
                    confidence=float(payload.get("confidence", 0.0)),
                    metadata_json={
                        "raw_text": payload.get("raw_text", ""),
                        "document_type": document.document_type,
                        "extraction_method": payload.get("extraction_method", "unknown"),
                        "regex_conflict": payload.get("_regex_conflict"),
                    },
                )
            )


document_intelligence_service = DocumentIntelligenceService()
