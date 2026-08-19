from collections import defaultdict
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, ApplicationProfile, ExtractedData


FIELD_SECTIONS = {
    "applicant_name": ("applicant", "name"),
    "organization_type": ("applicant", "organization_type"),
    "project_title": ("project", "title"),
    "project_category": ("project", "category"),
    "duration_months": ("timeline", "duration_months"),
    "project_cost": ("financial", "project_cost"),
    "certificate_number": ("certificates", "certificate_number"),
    "environmental_benefit": ("environmental_attributes", "benefit"),
}


FORM_FIELD_MAP = {
    "applicant_name": "applicant_name",
    "organization_type": "organization_type",
    "project_title": "project_title",
    "project_category": "project_category",
    "duration_months": "duration_months",
    "project_cost": "project_cost",
    "certificate_number": "certificate_number",
    "environmental_benefit": "environmental_benefit",
}


def get_profile_value(profile: dict[str, Any], dotted_path: str) -> Any:
    current: Any = profile
    for part in dotted_path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    if isinstance(current, dict) and "selected_value" in current:
        return current.get("selected_value")
    return current


class NormalizationService:
    def normalize(self, db: Session, application: Application) -> ApplicationProfile:
        extracted_items = db.scalars(
            select(ExtractedData).where(ExtractedData.application_id == application.id)
        ).all()

        raw_values: dict[str, list[dict[str, Any]]] = defaultdict(list)
        confidences: list[float] = []

        form_data = application.form_data or {}
        for source_field, profile_field in FORM_FIELD_MAP.items():
            if source_field in form_data and form_data[source_field] not in (None, ""):
                raw_values[profile_field].append(
                    {
                        "value": form_data[source_field],
                        "source": "application_form_json",
                        "document_id": None,
                        "filename": "web/mobile form JSON",
                        "locator": source_field,
                        "confidence": 0.9,
                        "trusted": False,
                    }
                )
                confidences.append(0.9)

        for item in extracted_items:
            fields = (item.raw_data or {}).get("fields", {})
            for field_name, payload in fields.items():
                if field_name not in FIELD_SECTIONS:
                    continue
                evidence = payload.get("evidence", {})
                raw_values[field_name].append(
                    {
                        "value": payload.get("value"),
                        "source": "document_extraction",
                        "document_id": evidence.get("document_id"),
                        "filename": evidence.get("filename"),
                        "locator": evidence.get("locator"),
                        "confidence": payload.get("confidence", item.confidence),
                        "trusted": False,
                    }
                )
                confidences.append(float(payload.get("confidence", item.confidence)))

        profile = self._build_profile(application, raw_values, extracted_items, confidences)

        db.execute(delete(ApplicationProfile).where(ApplicationProfile.application_id == application.id))
        saved = ApplicationProfile(
            application_id=application.id,
            profile_json=profile,
            extraction_confidence=profile["extraction_metadata"]["average_confidence"],
            version=1,
        )
        db.add(saved)
        audit_service.record(
            db,
            "normalization_completed",
            application_id=application.id,
            payload={"extraction_confidence": saved.extraction_confidence},
        )
        return saved

    def _build_profile(
        self,
        application: Application,
        raw_values: dict[str, list[dict[str, Any]]],
        extracted_items: list[ExtractedData],
        confidences: list[float],
    ) -> dict[str, Any]:
        def selected(field: str) -> Any:
            values = raw_values.get(field, [])
            if not values:
                return None
            return sorted(values, key=lambda item: item.get("confidence", 0), reverse=True)[0]["value"]

        def field_payload(field: str) -> dict[str, Any]:
            return {
                "selected_value": selected(field),
                "raw_values": raw_values.get(field, []),
                "validated_value": None,
                "trusted": False,
            }

        doc_profiles = [
            {
                "document_id": item.document_id,
                "document_type": (item.raw_data or {}).get("document_type"),
                "summary": (item.raw_data or {}).get("summary"),
                "confidence": item.confidence,
            }
            for item in extracted_items
        ]

        average_confidence = round(sum(confidences) / len(confidences), 3) if confidences else 0.0
        return {
            "application_id": application.id,
            "applicant": {
                "name": field_payload("applicant_name"),
                "organization_type": field_payload("organization_type"),
            },
            "project": {
                "title": field_payload("project_title"),
                "category": field_payload("project_category"),
            },
            "financial": {
                "project_cost": field_payload("project_cost"),
                "project_costs": raw_values.get("project_cost", []),
            },
            "documents": doc_profiles,
            "certificates": {"certificate_number": field_payload("certificate_number")},
            "timeline": {"duration_months": field_payload("duration_months")},
            "environmental_attributes": {"benefit": field_payload("environmental_benefit")},
            "supporting_evidence": [],
            "extracted_entities": {
                field: [value["value"] for value in values] for field, values in raw_values.items()
            },
            "extraction_metadata": {
                "average_confidence": average_confidence,
                "raw_extraction_is_trusted": False,
                "validated_fields": [],
            },
        }


normalization_service = NormalizationService()

