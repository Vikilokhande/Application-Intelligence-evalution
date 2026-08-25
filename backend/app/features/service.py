"""
features/service.py
===================

Feature Engineering Service.

Produces the 13 canonical ML features required by the trained XGBoost models,
plus internal pipeline metrics. The ML scoring step uses only the 13 canonical
features; all others are available for audit/explainability.

13 Canonical ML Features (must be present and in this order for ML):
  document_completeness, required_field_completeness, eligibility_pass_ratio,
  budget_consistency, certificate_validity, contradiction_count,
  duplicate_similarity, suspicious_indicator_count, document_quality,
  proposal_quality, project_feasibility, environmental_impact,
  extraction_confidence
"""

import logging
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.ml.scoring import FEATURE_NAMES, FEATURE_SCHEMA_VERSION
from app.normalization.service import get_profile_value
from app.models import Application, FeatureSet, RuleResult, ValidationResult

logger = logging.getLogger(__name__)

# The 13 features the ML models require — derived from FEATURE_NAMES in scoring.py
ML_FEATURE_NAMES = FEATURE_NAMES


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

        # Verify all 13 ML features are present
        missing_ml = [f for f in ML_FEATURE_NAMES if f not in features]
        if missing_ml:
            logger.error(
                "[PIPELINE] FEATURE_ENGINEERING missing ML features: %s", missing_ml
            )

        ml_feature_count = sum(1 for f in ML_FEATURE_NAMES if f in features)
        # Canonical log format
        logger.info(
            "[FEATURE_ENGINEERING] features=%d/%d total=%d",
            ml_feature_count, len(ML_FEATURE_NAMES), len(features),
        )
        # Per-feature trace log
        for fname in ML_FEATURE_NAMES:
            logger.info(
                "[FEATURE_ENGINEERING] feature=%s value=%.4f",
                fname, float(features.get(fname, 0.0)),
            )
        logger.info(
            "[PIPELINE] FEATURE_ENGINEERING total_features=%d ml_features=%d/%d",
            len(features), ml_feature_count, len(ML_FEATURE_NAMES),
        )

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
            payload={
                "stage": "FEATURE_ENGINEERING",
                "feature_count": len(features),
                "ml_feature_count": ml_feature_count,
                "feature_version": FEATURE_SCHEMA_VERSION,
                **{k: features[k] for k in ML_FEATURE_NAMES if k in features},
            },
        )
        return feature_set

    def to_feature_dict(
        self,
        profile: dict[str, Any],
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> dict[str, float]:
        """
        Build all features. The 13 ML features are computed first and are guaranteed
        to be present. Additional features are included for audit/explainability.
        """
        # ── Document completeness ─────────────────────────────────────────────
        required_doc_result = next(
            (item for item in validation_results if item.validation_type == "REQUIRED_DOCUMENT"), None
        )
        missing_documents = len((required_doc_result.evidence or {}).get("missing", [])) if required_doc_result else 0
        required_documents = max(len((required_doc_result.evidence or {}).get("required", [])) if required_doc_result else 1, 1)
        document_completeness = round(max(required_documents - missing_documents, 0) / required_documents, 3)

        # ── Required field completeness ───────────────────────────────────────
        required_field_total = max(
            sum(1 for item in validation_results if item.validation_type == "REQUIRED_FIELD"), 1
        )
        required_field_pass = sum(
            1 for item in validation_results
            if item.validation_type == "REQUIRED_FIELD" and item.status == "PASS"
        )
        required_field_completeness = round(required_field_pass / required_field_total, 3)

        # ── Eligibility pass ratio ────────────────────────────────────────────
        rule_total = max(len(rule_results), 1)
        rule_pass = sum(1 for item in rule_results if item.result == "PASS")
        eligibility_pass_ratio = round(rule_pass / rule_total, 3)

        # ── Budget consistency ────────────────────────────────────────────────
        cost_consistency = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_PROJECT_COST")
        budget_consistency = cost_consistency

        # ── Certificate validity ──────────────────────────────────────────────
        certificate_validity = (
            0.0
            if any(
                item.validation_type == "AUTHENTICITY_INDICATOR" and item.status != "PASS"
                for item in validation_results
            )
            else 1.0
        )

        # ── Contradiction count ───────────────────────────────────────────────
        contradiction_count = float(sum(
            1 for item in validation_results
            if item.validation_type == "CROSS_DOCUMENT_CONSISTENCY" and item.status == "FAIL"
        ))

        # ── Duplicate similarity ──────────────────────────────────────────────
        duplicate_similarity = 1.0 if any(
            item.validation_type == "DUPLICATE_DETECTION" and item.status != "PASS"
            for item in validation_results
        ) else 0.0

        # ── Suspicious indicator count ────────────────────────────────────────
        suspicious_indicator_count = float(sum(
            len((item.evidence or {}).get("indicators", []))
            for item in validation_results
            if item.validation_type == "SUSPICIOUS_INDICATOR"
        ))

        # ── Extraction confidence ─────────────────────────────────────────────
        extraction_confidence = round(
            float(profile.get("extraction_metadata", {}).get("average_confidence", 0.0)), 3
        )

        # ── Validation confidence (used for derived features) ─────────────────
        validation_confidence = self._validation_confidence(validation_results)

        # ── Document quality ──────────────────────────────────────────────────
        validation_total = max(len(validation_results), 1)
        validation_pass = sum(1 for item in validation_results if item.status == "PASS")
        validation_not_checked = sum(1 for item in validation_results if item.status == "NOT_CHECKED")
        document_quality = round(
            (validation_pass + validation_not_checked * 0.25) / validation_total, 3
        )

        # ── Proposal quality ──────────────────────────────────────────────────
        proposal_quality = round(
            (required_field_completeness + extraction_confidence + validation_confidence) / 3, 3
        )

        # ── Project feasibility ───────────────────────────────────────────────
        duration_consistency = self._consistency_ratio(validation_results, "CROSS_DOCUMENT_DURATION_MONTHS")
        project_feasibility = round(
            (eligibility_pass_ratio + budget_consistency + duration_consistency) / 3, 3
        )

        # ── Environmental impact ──────────────────────────────────────────────
        env_benefit = profile.get("environmental_attributes", {}).get("benefit", {})
        if isinstance(env_benefit, dict):
            env_selected = env_benefit.get("selected_value")
        else:
            env_selected = env_benefit if env_benefit else None
        environmental_impact = 1.0 if env_selected else 0.0

        # ── 13 Canonical ML Features ──────────────────────────────────────────
        features: dict[str, float] = {
            "document_completeness": document_completeness,
            "required_field_completeness": required_field_completeness,
            "eligibility_pass_ratio": eligibility_pass_ratio,
            "budget_consistency": budget_consistency,
            "certificate_validity": certificate_validity,
            "contradiction_count": contradiction_count,
            "duplicate_similarity": duplicate_similarity,
            "suspicious_indicator_count": suspicious_indicator_count,
            "document_quality": document_quality,
            "proposal_quality": proposal_quality,
            "project_feasibility": project_feasibility,
            "environmental_impact": environmental_impact,
            "extraction_confidence": extraction_confidence,
        }

        # ── Additional pipeline features (audit/explainability only) ──────────
        rag_checks = [
            item for item in validation_results if (item.evidence or {}).get("validator") == "rag"
        ]
        rag_pass = sum(1 for item in rag_checks if item.status == "PASS")
        rag_retrieval_confidence = max(
            [float((item.evidence or {}).get("confidence", 0.0) or 0.0) for item in rag_checks] or [0.0]
        )
        rag_validation_fail_count = self._count_by_validator(validation_results, "rag", "FAIL")

        org_rule = self._rule_by_id(rule_results, "ELIGIBLE_ORGANIZATION_TYPE")
        cost_rule = self._rule_by_id(rule_results, "PROJECT_COST_LIMIT")
        duration_rule = self._rule_by_id(rule_results, "PROJECT_DURATION_LIMIT")
        category_rule = self._rule_by_id(rule_results, "REQUIRED_PROJECT_CATEGORY")

        project_cost = self._safe_float(get_profile_value(profile, "financial.project_cost"))
        project_duration = self._safe_float(get_profile_value(profile, "timeline.duration_months"))

        features.update({
            # Internal pipeline metrics
            "validation_confidence": validation_confidence,
            "rag_retrieval_confidence": round(rag_retrieval_confidence, 3),
            "scheme_guideline_match_score": round(rag_pass / max(len(rag_checks), 1), 3),
            "scheme_eligibility_match": 0.0 if rag_validation_fail_count else (1.0 if rag_checks else 0.0),
            "normalization_confidence": round(extraction_confidence, 3),
            "organization_eligibility": 1.0 if org_rule is None or org_rule.result == "PASS" else 0.0,
            "deterministic_fail_count": float(self._count_by_validator(validation_results, "deterministic", "FAIL")),
            "deterministic_warning_count": float(self._count_by_validator(validation_results, "deterministic", "WARN")),
            "llm_validation_fail_count": float(self._count_by_validator(validation_results, "llm", "FAIL")),
            "llm_validation_warning_count": float(self._count_by_validator(validation_results, "llm", "WARN")),
            "rag_validation_fail_count": float(rag_validation_fail_count),
            "missing_document_count": float(missing_documents),
            "eligibility_rule_fail_count": float(
                sum(1 for rule in rule_results if rule.result == "FAIL" and "ELIGIBLE" in rule.rule_id)
            ),
            "financial_rule_fail_count": 1.0 if cost_rule is not None and cost_rule.result == "FAIL" else 0.0,
            "duration_rule_fail_count": 1.0 if duration_rule is not None and duration_rule.result == "FAIL" else 0.0,
            "category_rule_fail_count": 1.0 if category_rule is not None and category_rule.result == "FAIL" else 0.0,
            "applicant_name_match_ratio": self._consistency_ratio(validation_results, "CROSS_DOCUMENT_APPLICANT_NAME"),
            "project_title_match_ratio": self._consistency_ratio(validation_results, "CROSS_DOCUMENT_PROJECT_TITLE"),
            "project_cost_consistency": cost_consistency,
            "duration_consistency": duration_consistency,
            "organization_consistency": self._consistency_ratio(validation_results, "CROSS_DOCUMENT_ORGANIZATION_TYPE"),
            "document_type_consistency": self._document_type_consistency(validation_results),
            "project_cost": project_cost,
            "project_duration": project_duration,
            "requested_funding": project_cost,
        })

        return features

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _count_by_validator(self, results: list[ValidationResult], validator: str, status: str) -> int:
        return sum(
            1 for item in results
            if (item.evidence or {}).get("validator") == validator and item.status == status
        )

    def _validation_confidence(self, results: list[ValidationResult]) -> float:
        confidences = [float((item.evidence or {}).get("confidence", 0.0) or 0.0) for item in results]
        return round(sum(confidences) / len(confidences), 3) if confidences else 0.0

    def _rule_by_id(self, rules: list[RuleResult], rule_id: str) -> RuleResult | None:
        return next((rule for rule in rules if rule.rule_id == rule_id), None)

    def _consistency_ratio(self, results: list[ValidationResult], check_id: str) -> float:
        result = next((item for item in results if (item.evidence or {}).get("check_id") == check_id), None)
        if result is None or result.status == "NOT_CHECKED":
            return 1.0
        if result.status == "FAIL":
            return 0.0
        # "PASS" or "NOT_VERIFIABLE" (uncontradicted single-source)
        return 1.0

    def _document_type_consistency(self, results: list[ValidationResult]) -> float:
        llm_results = [
            item for item in results if (item.evidence or {}).get("check_id") == "DOC_TYPE_CONSISTENCY"
        ]
        if not llm_results:
            return 1.0
        return 0.0 if any(item.status == "FAIL" for item in llm_results) else 1.0

    def _safe_float(self, value: Any) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0


feature_engineering_service = FeatureEngineeringService()
