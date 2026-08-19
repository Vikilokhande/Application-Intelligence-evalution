from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.exceptions import ModelUnavailableError
from app.models import Application, ModelPrediction


class ScoringService(ABC):
    @abstractmethod
    def score(self, features: dict[str, float]) -> dict[str, Any]:
        raise NotImplementedError


class XGBoostScoringService(ScoringService):
    def __init__(self, model_path: str) -> None:
        self.model_path = model_path
        self.model: Any | None = None

    def load(self) -> None:
        try:
            import xgboost as xgb  # type: ignore
        except ImportError as exc:
            raise ModelUnavailableError("XGBoost is not installed; using development mock scoring.") from exc
        self.model = xgb.XGBClassifier()
        self.model.load_model(self.model_path)

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        if self.model is None:
            self.load()
        raise ModelUnavailableError("Production XGBoost model is not configured for this POC.")


class MockScoringService(ScoringService):
    model_name = "MockScoringService"
    model_version = "development-0.1"

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        contradiction_penalty = features.get("contradiction_count", 0.0) * 18
        suspicious_penalty = features.get("suspicious_indicator_count", 0.0) * 10
        duplicate_penalty = features.get("duplicate_similarity", 0.0) * 20
        missing_doc_penalty = (1 - features.get("document_completeness", 0.0)) * 22
        rule_penalty = (1 - features.get("eligibility_pass_ratio", 0.0)) * 24
        low_confidence_penalty = (1 - features.get("extraction_confidence", 0.0)) * 12

        risk_score = min(
            100.0,
            8
            + contradiction_penalty
            + suspicious_penalty
            + duplicate_penalty
            + missing_doc_penalty
            + rule_penalty
            + low_confidence_penalty,
        )
        quality_score = max(
            0.0,
            100
            - risk_score
            + features.get("environmental_impact", 0.0) * 6
            + features.get("proposal_quality", 0.0) * 4,
        )
        confidence = max(
            0.25,
            min(
                0.95,
                0.35
                + features.get("extraction_confidence", 0.0) * 0.35
                + features.get("document_completeness", 0.0) * 0.2
                + features.get("budget_consistency", 0.0) * 0.05,
            ),
        )
        prediction_class = "HIGH_RISK" if risk_score >= 70 else "MEDIUM_RISK" if risk_score >= 40 else "LOW_RISK"
        contributions = {
            "contradiction_count": round(contradiction_penalty, 3),
            "suspicious_indicator_count": round(suspicious_penalty, 3),
            "duplicate_similarity": round(duplicate_penalty, 3),
            "document_completeness": round(-missing_doc_penalty, 3),
            "eligibility_pass_ratio": round(-rule_penalty, 3),
            "extraction_confidence": round(-low_confidence_penalty, 3),
        }
        return {
            "quality_score": round(min(100.0, quality_score), 2),
            "risk_score": round(risk_score, 2),
            "confidence": round(confidence, 3),
            "prediction_class": prediction_class,
            "feature_contributions": contributions,
            "status": "GENERATED_DEVELOPMENT_MODEL",
        }


class PredictionPersistenceService:
    def __init__(self, scoring_service: ScoringService | None = None) -> None:
        self.scoring_service = scoring_service or MockScoringService()

    def score_and_save(self, db: Session, application: Application, features: dict[str, float]) -> ModelPrediction:
        db.execute(delete(ModelPrediction).where(ModelPrediction.application_id == application.id))
        try:
            result = self.scoring_service.score(features)
            prediction = ModelPrediction(
                application_id=application.id,
                model_name=getattr(self.scoring_service, "model_name", self.scoring_service.__class__.__name__),
                model_version=getattr(self.scoring_service, "model_version", "development"),
                quality_score=result["quality_score"],
                risk_score=result["risk_score"],
                confidence=result["confidence"],
                prediction_class=result["prediction_class"],
                feature_contributions=result["feature_contributions"],
                status=result["status"],
            )
        except ModelUnavailableError as exc:
            prediction = ModelPrediction(
                application_id=application.id,
                model_name="Unavailable",
                model_version="none",
                quality_score=None,
                risk_score=None,
                confidence=0.0,
                prediction_class="UNAVAILABLE",
                feature_contributions={},
                status=exc.message,
            )
        db.add(prediction)
        audit_service.record(
            db,
            "ml_prediction_generated",
            application_id=application.id,
            payload={"status": prediction.status, "prediction_class": prediction.prediction_class},
        )
        return prediction


prediction_service = PredictionPersistenceService()

