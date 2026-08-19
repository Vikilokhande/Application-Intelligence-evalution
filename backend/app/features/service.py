from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, FeatureSet, RuleResult, ValidationResult


class FeatureEngineeringService:
    def build_features(
        self,
        db: Session,
        application: Application,
        profile: dict[str, Any],
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> FeatureSet:
        db.execute(delete(FeatureSet).where(FeatureSet.application_id == application.id))
        features = self.to_feature_dict(profile, validation_results, rule_results)
        feature_set = FeatureSet(application_id=application.id, features_json=features, trusted=True)
        db.add(feature_set)
        audit_service.record(db, "feature_engineering_completed", application_id=application.id, payload=features)
        return feature_set

    def to_feature_dict(
        self,
        profile: dict[str, Any],
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> dict[str, float]:
        validation_total = max(len(validation_results), 1)
        validation_pass = sum(1 for item in validation_results if item.status == "PASS")
        required_field_total = max(sum(1 for item in validation_results if item.validation_type == "REQUIRED_FIELD"), 1)
        required_field_pass = sum(
            1 for item in validation_results if item.validation_type == "REQUIRED_FIELD" and item.status == "PASS"
        )
        required_doc_result = next((item for item in validation_results if item.validation_type == "REQUIRED_DOCUMENT"), None)
        missing_documents = len((required_doc_result.evidence or {}).get("missing", [])) if required_doc_result else 0
        required_documents = len((required_doc_result.evidence or {}).get("required", [])) if required_doc_result else 1
        contradiction_count = sum(
            1
            for item in validation_results
            if item.validation_type == "CROSS_DOCUMENT_CONSISTENCY" and item.status == "FAIL"
        )
        duplicate_similarity = 1.0 if any(
            item.validation_type == "DUPLICATE_DETECTION" and item.status != "PASS" for item in validation_results
        ) else 0.0
        suspicious_indicator_count = sum(
            len((item.evidence or {}).get("indicators", []))
            for item in validation_results
            if item.validation_type == "SUSPICIOUS_INDICATOR"
        )
        rule_total = max(len(rule_results), 1)
        rule_pass = sum(1 for item in rule_results if item.result == "PASS")
        extraction_confidence = float(profile.get("extraction_metadata", {}).get("average_confidence", 0.0))

        return {
            "document_completeness": round(max(required_documents - missing_documents, 0) / max(required_documents, 1), 3),
            "required_field_completeness": round(required_field_pass / required_field_total, 3),
            "eligibility_pass_ratio": round(rule_pass / rule_total, 3),
            "budget_consistency": 0.0 if contradiction_count else 1.0,
            "certificate_validity": 0.0
            if any(item.validation_type == "AUTHENTICITY_INDICATOR" and item.status != "PASS" for item in validation_results)
            else 1.0,
            "contradiction_count": float(contradiction_count),
            "duplicate_similarity": duplicate_similarity,
            "suspicious_indicator_count": float(suspicious_indicator_count),
            "document_quality": round(validation_pass / validation_total, 3),
            "proposal_quality": round((required_field_pass / required_field_total + extraction_confidence) / 2, 3),
            "project_feasibility": round((rule_pass / rule_total + (1.0 if not contradiction_count else 0.35)) / 2, 3),
            "environmental_impact": 0.7
            if profile.get("environmental_attributes", {}).get("benefit", {}).get("selected_value")
            else 0.4,
            "extraction_confidence": round(extraction_confidence, 3),
        }


feature_engineering_service = FeatureEngineeringService()

