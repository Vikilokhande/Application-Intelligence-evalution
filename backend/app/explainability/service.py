from typing import Any

from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, Evidence, ModelPrediction, RuleResult, ValidationResult


class ExplainabilityService:
    def explain(
        self,
        db: Session,
        application: Application,
        prediction: ModelPrediction,
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> dict[str, Any]:
        failed_rules = [rule for rule in rule_results if rule.result in {"FAIL", "ERROR"}]
        failed_validations = [item for item in validation_results if item.status in {"FAIL", "WARN"}]
        top_contributions = sorted(
            prediction.feature_contributions.items(),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:5]
        explanation = {
            "recommendation_context": {
                "prediction_class": prediction.prediction_class,
                "quality_score": prediction.quality_score,
                "risk_score": prediction.risk_score,
                "confidence": prediction.confidence,
                "note": "Development scoring is decision support only and is not a final decision.",
            },
            "top_feature_contributions": top_contributions,
            "failed_rules": [rule.rule_id for rule in failed_rules],
            "validation_findings": [item.validation_type for item in failed_validations],
            "evidence_first_trace": [
                {
                    "finding": item.validation_type,
                    "reason": item.message,
                    "evidence": item.evidence,
                    "confidence": prediction.confidence,
                }
                for item in failed_validations
            ],
        }
        db.add(
            Evidence(
                application_id=application.id,
                finding_type="MODEL_EXPLANATION",
                source=prediction.model_name,
                locator="feature_contributions",
                field_name="risk_score",
                extracted_value=str(prediction.risk_score),
                confidence=prediction.confidence,
                metadata_json=explanation,
            )
        )
        audit_service.record(db, "evidence_generated", application_id=application.id, payload=explanation)
        return explanation


explainability_service = ExplainabilityService()

