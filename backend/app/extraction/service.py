import re
from pathlib import Path
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.extraction.providers import LocalTextParser, MockLLMProvider, MockOCRProvider
from app.models import Document, Evidence, ExtractedData


COST_RE = re.compile(
    r"(?:project[_\s-]*cost|total[_\s-]*cost|budget[_\s-]*total|cost)\s*[:=]\s*(?:inr|rs\.?)?\s*([0-9][0-9,\.]*)\s*(lakh|lakhs|crore|crores)?",
    re.IGNORECASE,
)
DURATION_RE = re.compile(r"(?:duration|duration_months|project_duration)\s*[:=]\s*([0-9]{1,3})\s*(?:months|month|m)?", re.IGNORECASE)
FIELD_PATTERNS = {
    "applicant_name": re.compile(r"(?:applicant|applicant_name|organization)\s*[:=]\s*([A-Za-z0-9 &.,'-]{3,160})", re.IGNORECASE),
    "project_title": re.compile(r"(?:project_title|project title|title)\s*[:=]\s*([A-Za-z0-9 &.,'/-]{3,200})", re.IGNORECASE),
    "organization_type": re.compile(r"(?:organization_type|organization type)\s*[:=]\s*([A-Za-z ]{3,80})", re.IGNORECASE),
    "project_category": re.compile(r"(?:project_category|project category|category)\s*[:=]\s*([A-Za-z &/-]{3,120})", re.IGNORECASE),
    "certificate_number": re.compile(r"(?:certificate_number|certificate no|certificate)\s*[:=]\s*([A-Za-z0-9/-]{3,80})", re.IGNORECASE),
    "environmental_benefit": re.compile(r"(?:environmental_benefit|impact|benefit)\s*[:=]\s*([A-Za-z0-9 ,.'/-]{8,240})", re.IGNORECASE),
}


def classify_document(filename: str, declared_type: str | None = None) -> str:
    if declared_type and declared_type != "UNKNOWN":
        return declared_type.upper()
    name = filename.lower()
    if "proposal" in name:
        return "PROPOSAL"
    if "budget" in name or name.endswith(".xlsx") or name.endswith(".csv"):
        return "BUDGET"
    if "certificate" in name or "cert" in name:
        return "CERTIFICATE"
    if "report" in name:
        return "REPORT"
    if "form" in name or name.endswith(".json"):
        return "APPLICATION_FORM"
    if name.endswith((".jpg", ".jpeg", ".png")):
        return "IMAGE"
    return "SUPPORTING_RECORD"


def _money_to_rupees(number_text: str, unit: str | None) -> float:
    value = float(number_text.replace(",", ""))
    normalized_unit = (unit or "").lower()
    if normalized_unit.startswith("lakh"):
        return value * 100_000
    if normalized_unit.startswith("crore"):
        return value * 10_000_000
    return value


class DocumentIntelligenceService:
    def __init__(self) -> None:
        self.parser = LocalTextParser()
        self.ocr = MockOCRProvider()
        self.llm = MockLLMProvider()

    def process_document(self, db: Session, document: Document) -> ExtractedData:
        document.document_type = classify_document(document.filename, document.document_type)
        document.processing_status = "PROCESSING"
        document.extraction_status = "PROCESSING"
        db.flush()

        parsed = self.parser.parse(Path(document.file_path), document.mime_type)
        text = parsed.get("text", "")
        if not text and document.document_type == "IMAGE":
            text = self.ocr.extract_text(Path(document.file_path))

        fields = self._extract_fields(text, document)
        summary = self.llm.summarize(text)
        confidence = self._confidence(fields, text)
        raw_data = {
            "document_type": document.document_type,
            "text_excerpt": text[:1200],
            "summary": summary,
            "fields": fields,
            "metadata": parsed.get("metadata", {}),
        }

        db.execute(delete(ExtractedData).where(ExtractedData.document_id == document.id))
        extracted = ExtractedData(
            application_id=document.application_id,
            document_id=document.id,
            extraction_type="DOCUMENT_INTELLIGENCE",
            raw_data=raw_data,
            confidence=confidence,
            provider="local_mock_document_intelligence",
            status="EXTRACTED",
        )
        db.add(extracted)
        self._persist_field_evidence(db, document, fields)

        document.processing_status = "PROCESSED"
        document.extraction_status = "EXTRACTED"
        audit_service.record(
            db,
            "extraction_completed",
            application_id=document.application_id,
            payload={"document_id": document.id, "document_type": document.document_type, "confidence": confidence},
        )
        return extracted

    def _extract_fields(self, text: str, document: Document) -> dict[str, Any]:
        fields: dict[str, Any] = {}
        cost_match = COST_RE.search(text)
        if cost_match:
            fields["project_cost"] = self._field_payload(
                _money_to_rupees(cost_match.group(1), cost_match.group(2)),
                cost_match.group(0),
                document,
                "project_cost",
                0.86,
            )

        duration_match = DURATION_RE.search(text)
        if duration_match:
            fields["duration_months"] = self._field_payload(
                int(duration_match.group(1)),
                duration_match.group(0),
                document,
                "duration_months",
                0.84,
            )

        for field_name, pattern in FIELD_PATTERNS.items():
            match = pattern.search(text)
            if match:
                fields[field_name] = self._field_payload(
                    match.group(1).strip(),
                    match.group(0),
                    document,
                    field_name,
                    0.82,
                )
        return fields

    def _field_payload(
        self,
        value: Any,
        raw_text: str,
        document: Document,
        field_name: str,
        confidence: float,
    ) -> dict[str, Any]:
        locator = "sheet/cell inferred" if document.document_type == "BUDGET" else "page 1 / detected section"
        return {
            "value": value,
            "raw_text": raw_text,
            "confidence": confidence,
            "evidence": {
                "document_id": document.id,
                "filename": document.filename,
                "document_type": document.document_type,
                "locator": locator,
                "field_name": field_name,
                "extracted_value": str(value),
            },
        }

    def _confidence(self, fields: dict[str, Any], text: str) -> float:
        if fields:
            return round(sum(item["confidence"] for item in fields.values()) / len(fields), 3)
        return 0.35 if text else 0.1

    def _persist_field_evidence(self, db: Session, document: Document, fields: dict[str, Any]) -> None:
        for field_name, payload in fields.items():
            evidence = payload.get("evidence", {})
            db.add(
                Evidence(
                    application_id=document.application_id,
                    document_id=document.id,
                    finding_type="EXTRACTED_FIELD",
                    source=document.filename,
                    locator=evidence.get("locator"),
                    field_name=field_name,
                    extracted_value=str(payload.get("value")),
                    confidence=float(payload.get("confidence", 0.0)),
                    metadata_json={"raw_text": payload.get("raw_text"), "document_type": document.document_type},
                )
            )


document_intelligence_service = DocumentIntelligenceService()

