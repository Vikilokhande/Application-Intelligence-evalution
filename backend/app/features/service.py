from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.ml.scoring import FEATURE_SCHEMA_VERSION
from app.normalization.service import get_profile_value
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
        feature_set = FeatureSet(
            application_id=application.id,
            features_json=features,
            trusted=True,
            feature_version=FEATURE_SCHEMA_VERSION,
        )
        db.add(feature_set)
        audit_service.record(
            db,
            "FEATURES_GENERATED",
            application_id=application.id,
            actor_id="SYSTEM",
            payload={"stage": "FEATURE_ENGINEERING", "feature_count": len(features), "feature_version": FEATURE_SCHEMA_VERSION, **features},
        )
        return feature_set

    def to_feature_dict(
        self,
        profile: dict[str, Any],
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> dict[str, float]:
        validation_total = max(len(validation_results), 1)
        validation_pass = sum(1 for item in validation_results if item.status == "PASS")
        validation_not_checked = sum(1 for item in validation_results if item.status == "NOT_CHECKED")
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
        validation_confidence = self._validation_confidence(validation_results)
        deterministic_fail_count = self._count_by_validator(validation_results, "deterministic", "FAIL")
        deterministic_warning_count = self._count_by_validator(validation_results, "deterministic", "WARN")
        llm_validation_fail_count = self._count_by_validator(validation_results, "llm", "FAIL")
        llm_validation_warning_count = self._count_by_validator(validation_results, "llm", "WARN")
        rag_validation_fail_count = self._count_by_validator(validation_results, "rag", "FAIL")
        rag_checks = [item for item in validation_results if (item.evidence or {}).get("validator") == "rag"]
        rag_pass = sum(1 for item in rag_checks if item.status == "PASS")
        rag_retrieval_confidence = max(
            [float((item.evidence or {}).get("confidence", 0.0) or 0.0) for item in rag_checks] or [0.0]
        )
        org_rule = self._rule_by_id(rule_results, "ELIGIBLE_ORGANIZATION_TYPE")
        cost_rule = self._rule_by_id(rule_results, "PROJECT_COST_LIMIT")
        duration_rule = self._rule_by_id(rule_results, "PROJECT_DURATION_LIMIT")
        category_rule = self._rule_by_id(rule_results, "REQUIRED_PROJECT_CATEGORY")
        applicant_match = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_APPLICANT_NAME")
        title_match = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_PROJECT_TITLE")
        cost_consistency = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_PROJECT_COST")
        duration_consistency = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_DURATION_MONTHS")
        org_consistency = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_ORGANIZATION_TYPE")
        document_type_consistency = self._document_type_consistency(validation_results)
        project_cost = self._safe_float(get_profile_value(profile, "financial.project_cost"))
        project_duration = self._safe_float(get_profile_value(profile, "timeline.duration_months"))

        document_completeness_ratio = round(max(required_documents - missing_documents, 0) / max(required_documents, 1), 3)
        application_completeness = round(required_field_pass / required_field_total, 3)
        eligibility_pass_ratio = round(rule_pass / rule_total, 3)
        budget_consistency = cost_consistency
        features = {
            "document_completeness_ratio": document_completeness_ratio,
            "required_document_missing_count": float(missing_documents),
            "application_completeness": application_completeness,
            "project_cost": project_cost,
            "project_duration": project_duration,
            "requested_funding": project_cost,
            "organization_eligibility": 1.0 if org_rule is None or org_rule.result == "PASS" else 0.0,
            "deterministic_fail_count": float(deterministic_fail_count),
            "deterministic_warning_count": float(deterministic_warning_count),
            "llm_validation_fail_count": float(llm_validation_fail_count),
            "llm_validation_warning_count": float(llm_validation_warning_count),
            "rag_validation_fail_count": float(rag_validation_fail_count),
            "contradiction_count": float(contradiction_count),
            "missing_document_count": float(missing_documents),
            "eligibility_rule_fail_count": float(sum(1 for rule in rule_results if rule.result == "FAIL" and "ELIGIBLE" in rule.rule_id)),
            "financial_rule_fail_count": 1.0 if cost_rule is not None and cost_rule.result == "FAIL" else 0.0,
            "duration_rule_fail_count": 1.0 if duration_rule is not None and duration_rule.result == "FAIL" else 0.0,
            "category_rule_fail_count": 1.0 if category_rule is not None and category_rule.result == "FAIL" else 0.0,
            "applicant_name_match_ratio": applicant_match,
            "project_title_match_ratio": title_match,
            "project_cost_consistency": cost_consistency,
            "duration_consistency": duration_consistency,
            "organization_consistency": org_consistency,
            "document_type_consistency": document_type_consistency,
            "ocr_quality": extraction_confidence,
            "rag_retrieval_confidence": rag_retrieval_confidence,
            "scheme_guideline_match_score": round(rag_pass / max(len(rag_checks), 1), 3),
            "scheme_eligibility_match": 0.0 if rag_validation_fail_count else 1.0 if rag_checks else 0.0,
            "normalization_confidence": round(extraction_confidence, 3),
            "validation_confidence": validation_confidence,
            "document_completeness": document_completeness_ratio,
            "required_field_completeness": application_completeness,
            "eligibility_pass_ratio": eligibility_pass_ratio,
            "budget_consistency": budget_consistency,
            "certificate_validity": 0.0
            if any(item.validation_type == "AUTHENTICITY_INDICATOR" and item.status != "PASS" for item in validation_results)
            else 1.0,
            "contradiction_count": float(contradiction_count),
            "duplicate_similarity": duplicate_similarity,
            "suspicious_indicator_count": float(suspicious_indicator_count),
            "document_quality": round((validation_pass + validation_not_checked * 0.25) / validation_total, 3),
            "proposal_quality": round((application_completeness + extraction_confidence + validation_confidence) / 3, 3),
            "project_feasibility": round((eligibility_pass_ratio + budget_consistency + duration_consistency) / 3, 3),
            "environmental_impact": 1.0
            if profile.get("environmental_attributes", {}).get("benefit", {}).get("selected_value")
            else 0.0,
            "extraction_confidence": round(extraction_confidence, 3),
        }
        return features

    def _count_by_validator(self, results: list[ValidationResult], validator: str, status: str) -> int:
        return sum(1 for item in results if (item.evidence or {}).get("validator") == validator and item.status == status)

    def _validation_confidence(self, results: list[ValidationResult]) -> float:
        confidences = [float((item.evidence or {}).get("confidence", 0.0) or 0.0) for item in results]
        return round(sum(confidences) / len(confidences), 3) if confidences else 0.0

    def _rule_by_id(self, rules: list[RuleResult], rule_id: str) -> RuleResult | None:
        return next((rule for rule in rules if rule.rule_id == rule_id), None)

    def _consistency_ratio(self, results: list[ValidationResult], check_id: str) -> float:
        result = next((item for item in results if (item.evidence or {}).get("check_id") == check_id), None)
        if result is None or result.status == "NOT_CHECKED":
            return 1.0
        return 0.0 if result.status == "FAIL" else 1.0

    def _document_type_consistency(self, results: list[ValidationResult]) -> float:
        llm_results = [item for item in results if (item.evidence or {}).get("check_id") == "DOC_TYPE_CONSISTENCY"]
        if not llm_results:
            return 0.0
        return 0.0 if any(item.status == "FAIL" for item in llm_results) else 1.0

    def _safe_float(self, value: Any) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0


feature_engineering_service = FeatureEngineeringService()
