"""
ml/scoring.py
=============

Production ML scoring pipeline.

Production path: XGBoostScoringService → MODEL_UNAVAILABLE if no model file.

BaselineScoringService: deterministic rule-based scorer kept for explicit
  development/evaluation use. NOT used in the production path by default.

MockScoringService: TEST USE ONLY.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.config import get_settings
from app.core.exceptions import ModelUnavailableError
from app.models import Application, ModelPrediction

logger = logging.getLogger(__name__)

# Feature schema version — must match the schema used during training
FEATURE_SCHEMA_VERSION = "1.1"

# Ordered feature list; order MUST match the trained model's feature ordering
FEATURE_NAMES = [
    "document_completeness_ratio",
    "required_document_missing_count",
    "application_completeness",
    "project_cost",
    "project_duration",
    "requested_funding",
    "organization_eligibility",
    "deterministic_fail_count",
    "deterministic_warning_count",
    "llm_validation_fail_count",
    "llm_validation_warning_count",
    "rag_validation_fail_count",
    "contradiction_count",
    "missing_document_count",
    "eligibility_rule_fail_count",
    "financial_rule_fail_count",
    "duration_rule_fail_count",
    "category_rule_fail_count",
    "applicant_name_match_ratio",
    "project_title_match_ratio",
    "project_cost_consistency",
    "duration_consistency",
    "organization_consistency",
    "document_type_consistency",
    "ocr_quality",
    "rag_retrieval_confidence",
    "scheme_guideline_match_score",
    "scheme_eligibility_match",
    "normalization_confidence",
    "validation_confidence",
    "document_completeness",
    "required_field_completeness",
    "eligibility_pass_ratio",
    "budget_consistency",
    "certificate_validity",
    "contradiction_count",
    "duplicate_similarity",
    "suspicious_indicator_count",
    "document_quality",
    "proposal_quality",
    "project_feasibility",
    "environmental_impact",
    "extraction_confidence",
]

# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class ScoringService(ABC):
    @abstractmethod
    def score(self, features: dict[str, float]) -> dict[str, Any]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# XGBoost — Production Scorer
# ---------------------------------------------------------------------------


class XGBoostScoringService(ScoringService):
    """
    Production scorer backed by a trained XGBoost model.

    Raises ModelUnavailableError if:
    - model file does not exist
    - feature schema mismatch
    - xgboost package not installed

    Never fabricates predictions.
    """

    def __init__(self, model_path: str = "", feature_schema_path: str = "") -> None:
        settings = get_settings()
        self.model_path = Path(model_path or settings.ml_model_path)
        self.feature_schema_path = Path(feature_schema_path or settings.ml_feature_schema_path)
        self._model: Any = None
        self._feature_schema: dict[str, Any] | None = None
        self._model_version: str = settings.ml_model_version or "unknown"

    def _load(self) -> None:
        """Load model and feature schema. Raises ModelUnavailableError on any problem."""
        if not self.model_path.exists():
            raise ModelUnavailableError(
                f"XGBoost model file not found at '{self.model_path}'. "
                "Train the model first using ml/training/train.py, "
                "then ensure ML_MODEL_PATH is configured correctly."
            )

        try:
            import xgboost as xgb  # type: ignore
        except ImportError as exc:
            raise ModelUnavailableError(
                "xgboost package is not installed. "
                "Install with: pip install xgboost"
            ) from exc

        booster = xgb.Booster()
        booster.load_model(str(self.model_path))
        self._model = booster

        # Load feature schema for validation
        if self.feature_schema_path.exists():
            with open(self.feature_schema_path, encoding="utf-8") as f:
                self._feature_schema = json.load(f)
            schema_version = self._feature_schema.get("version", "unknown")
            if schema_version != FEATURE_SCHEMA_VERSION:
                raise ModelUnavailableError(
                    f"Feature schema version mismatch: model expects '{schema_version}', "
                    f"service has '{FEATURE_SCHEMA_VERSION}'. Retrain or update the service."
                )
            self._model_version = self._feature_schema.get("model_version", self._model_version)
            logger.info(
                "XGBoost model loaded: version=%s features=%d",
                self._model_version, len(FEATURE_NAMES),
            )
        else:
            logger.warning("Feature schema not found at %s; skipping schema validation.", self.feature_schema_path)

    def _validate_features(self, features: dict[str, float]) -> list[float]:
        """Return ordered feature vector; raise ModelUnavailableError on mismatch."""
        missing = [f for f in FEATURE_NAMES if f not in features]
        if missing:
            raise ModelUnavailableError(
                f"Feature mismatch: the following features are missing from the input: {missing}. "
                "Ensure the feature engineering service is producing all required features."
            )
        return [float(features[name]) for name in FEATURE_NAMES]

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        if self._model is None:
            self._load()

        import xgboost as xgb  # type: ignore
        import numpy as np  # type: ignore

        feature_vector = self._validate_features(features)
        dmatrix = xgb.DMatrix(
            np.array([feature_vector], dtype=float),
            feature_names=FEATURE_NAMES,
        )

        # Probability of HIGH_RISK (class 1) — calibrated to 0-100 risk score
        raw_proba = self._model.predict(dmatrix)
        risk_proba = float(raw_proba[0])
        risk_score = round(risk_proba * 100, 1)
        quality_score = round(max(0.0, 100.0 - risk_score), 1)
        confidence = round(abs(risk_proba - 0.5) * 2.0, 3)  # distance from decision boundary
        confidence = max(0.25, min(0.95, confidence + 0.35))

        if risk_score >= 70:
            prediction_class = "HIGH_RISK"
        elif risk_score >= 40:
            prediction_class = "MEDIUM_RISK"
        else:
            prediction_class = "LOW_RISK"

        # Feature contributions via gain/weight importance (native XGBoost)
        try:
            importance = self._model.get_score(importance_type="gain")
            total_gain = sum(importance.values()) or 1.0
            feature_contributions = {
                name: round(importance.get(name, 0.0) / total_gain, 4)
                for name in FEATURE_NAMES
            }
        except Exception:
            feature_contributions = {name: 0.0 for name in FEATURE_NAMES}

        return {
            "model_name": "XGBoostRiskClassifier",
            "model_version": self._model_version,
            "feature_version": FEATURE_SCHEMA_VERSION,
            "risk_score": risk_score,
            "quality_score": quality_score,
            "confidence": confidence,
            "prediction_class": prediction_class,
            "feature_contributions": feature_contributions,
            "status": "GENERATED",
            "provider": "xgboost",
        }


# ---------------------------------------------------------------------------
# Baseline Scorer — Development/Evaluation Only
# ---------------------------------------------------------------------------


class BaselineScoringService(ScoringService):
    """
    Deterministic rule-based baseline scorer.

    NOT ML. NOT to be used in production by default.
    Use for:
    - development when no trained model exists
    - establishing a performance baseline during model evaluation
    - explicit testing in test suite

    When used, its predictions carry status="GENERATED_DEVELOPMENT_MODEL"
    so they are NEVER confused with real ML predictions.
    """

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        risk_components = {
            "deterministic_fail_count": features.get("deterministic_fail_count", 0) * 9.0,
            "required_documents_missing": features.get("missing_document_count", 0) * 12.0,
            "cross_document_contradictions": features.get("contradiction_count", 0) * 16.0,
            "financial_rule_failures": features.get("financial_rule_fail_count", 0) * 14.0,
            "duration_rule_failures": features.get("duration_rule_fail_count", 0) * 10.0,
            "eligibility_rule_failures": features.get("eligibility_rule_fail_count", 0) * 14.0,
            "rag_guideline_failures": features.get("rag_validation_fail_count", 0) * 8.0,
            "llm_semantic_warnings": features.get("llm_validation_warning_count", 0) * 4.0,
            "suspicious_indicators": features.get("suspicious_indicator_count", 0) * 8.0,
            "duplicate_similarity": features.get("duplicate_similarity", 0) * 20.0,
            "document_incompleteness": (1.0 - features.get("document_completeness_ratio", features.get("document_completeness", 1))) * 18.0,
            "low_extraction_confidence": (1.0 - features.get("extraction_confidence", 1)) * 10.0,
            "low_validation_confidence": (1.0 - features.get("validation_confidence", 1)) * 8.0,
        }
        risk_score = min(100.0, max(0.0, 5.0 + sum(risk_components.values())))
        deterministic_blocking_failure = any(
            features.get(name, 0) > 0
            for name in (
                "financial_rule_fail_count",
                "duration_rule_fail_count",
                "eligibility_rule_fail_count",
                "category_rule_fail_count",
                "missing_document_count",
            )
        )
        if deterministic_blocking_failure:
            risk_score = max(risk_score, 55.0)

        quality_score = max(
            0.0,
            100.0
            - risk_score
            + features.get("environmental_impact", 0) * 5.0
            + features.get("proposal_quality", 0) * 5.0
            + features.get("scheme_guideline_match_score", 0) * 3.0,
        )
        quality_score = min(100.0, quality_score)

        extraction_confidence = features.get("extraction_confidence", 0.5)
        doc_completeness = features.get("document_completeness_ratio", features.get("document_completeness", 0.5))
        budget_consistency = features.get("budget_consistency", 1.0)
        validation_confidence = features.get("validation_confidence", 0.5)
        confidence = max(
            0.25,
            min(0.95, 0.25 + extraction_confidence * 0.25 + doc_completeness * 0.2 + budget_consistency * 0.1 + validation_confidence * 0.2),
        )

        if risk_score >= 70:
            prediction_class = "HIGH_RISK"
        elif risk_score >= 40:
            prediction_class = "MEDIUM_RISK"
        else:
            prediction_class = "LOW_RISK"

        top_risk_factors = [
            name for name, value in sorted(risk_components.items(), key=lambda item: item[1], reverse=True) if value > 0
        ][:5]
        positive_factors = []
        for name in (
            "document_completeness_ratio",
            "application_completeness",
            "budget_consistency",
            "duration_consistency",
            "organization_eligibility",
            "scheme_guideline_match_score",
            "extraction_confidence",
            "validation_confidence",
        ):
            if features.get(name, 0.0) >= 0.8:
                positive_factors.append(name)

        return {
            "model_name": "BaselineRuleScorer",
            "model_version": "1.0-baseline",
            "feature_version": FEATURE_SCHEMA_VERSION,
            "risk_score": round(risk_score, 1),
            "quality_score": round(quality_score, 1),
            "confidence": round(confidence, 3),
            "prediction_class": prediction_class,
            "feature_contributions": {
                key: round(value, 3)
                for key, value in risk_components.items()
                if value > 0
            },
            "status": "GENERATED_DEVELOPMENT_MODEL",
            "provider": "baseline",
            "model_label": "GENERATED_DEVELOPMENT_MODEL",
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "top_risk_factors": top_risk_factors,
            "positive_factors": positive_factors[:5],
        }


# ---------------------------------------------------------------------------
# MockScoringService — TEST USE ONLY
# ---------------------------------------------------------------------------


class MockScoringService(ScoringService):
    """
    TEST USE ONLY.
    Returns a labelled development-model prediction.
    Must not be used in production paths.
    """

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        return BaselineScoringService().score(features)


# ---------------------------------------------------------------------------
# Prediction Persistence Service
# ---------------------------------------------------------------------------


class PredictionPersistenceService:
    """
    Wraps a ScoringService and persists predictions to the database.

    Production default: XGBoostScoringService → MODEL_UNAVAILABLE if unavailable.
    """

    def __init__(self, scorer: ScoringService | None = None) -> None:
        self._scorer = scorer  # None = auto-select based on config

    def _get_scorer(self) -> ScoringService:
        if self._scorer is not None:
            return self._scorer
        settings = get_settings()
        if settings.ml_provider == "xgboost":
            return XGBoostScoringService()
        if settings.ml_provider == "baseline":
            logger.warning(
                "ML_PROVIDER=baseline: using deterministic baseline scorer (not ML). "
                "Results are labeled GENERATED_DEVELOPMENT_MODEL."
            )
            return BaselineScoringService()
        # 'unavailable' or unknown
        raise ModelUnavailableError(
            f"ML_PROVIDER='{settings.ml_provider}' — scoring is explicitly disabled. "
            "Set ML_PROVIDER=xgboost and train a model."
        )

    def score_and_save(
        self,
        db: Session,
        application: Application,
        features: dict[str, float],
    ) -> ModelPrediction:
        from sqlalchemy import delete

        # Remove previous predictions
        db.execute(delete(ModelPrediction).where(ModelPrediction.application_id == application.id))

        prediction_payload: dict[str, Any]
        try:
            scorer = self._get_scorer()
            prediction_payload = scorer.score(features)
        except ModelUnavailableError as exc:
            logger.warning("ML scoring unavailable for app=%s: %s", application.id, exc)
            prediction_payload = {
                "model_name": "unavailable",
                "model_version": "",
                "feature_version": FEATURE_SCHEMA_VERSION,
                "risk_score": None,
                "quality_score": None,
                "confidence": 0.0,
                "prediction_class": "UNAVAILABLE",
                "feature_contributions": {},
                "status": f"{exc.code}: {exc.message}",
                "provider": "none",
            }

        settings = get_settings()
        prediction = ModelPrediction(
            application_id=application.id,
            model_name=prediction_payload["model_name"],
            model_version=prediction_payload.get("model_version", ""),
            quality_score=prediction_payload.get("quality_score"),
            risk_score=prediction_payload.get("risk_score"),
            confidence=prediction_payload.get("confidence", 0.0),
            prediction_class=prediction_payload.get("prediction_class", "UNAVAILABLE"),
            feature_contributions=prediction_payload.get("feature_contributions", {}),
            status=prediction_payload.get("status", ""),
            feature_version=prediction_payload.get("feature_version", FEATURE_SCHEMA_VERSION),
            policy_version=settings.routing_policy_version,
            provider=prediction_payload.get("provider", settings.ml_provider),
        )
        db.add(prediction)

        audit_service.record(
            db,
            "ML_SCORE_GENERATED",
            application_id=application.id,
            actor_id="SYSTEM",
            payload={
                "stage": "ML_SCORING",
                "model_name": prediction.model_name,
                "model_version": prediction.model_version,
                "provider": prediction.provider,
                "prediction_class": prediction.prediction_class,
                "risk_score": prediction.risk_score,
                "quality_score": prediction.quality_score,
                "confidence": prediction.confidence,
                "status": prediction.status,
                "feature_schema_version": prediction.feature_version,
                "top_risk_factors": prediction_payload.get("top_risk_factors", []),
                "positive_factors": prediction_payload.get("positive_factors", []),
            },
        )
        logger.info(
            "[PIPELINE] application=%s stage=ML_SCORING provider=%s prediction_class=%s risk_score=%s quality_score=%s confidence=%.3f",
            application.id,
            prediction.provider,
            prediction.prediction_class,
            prediction.risk_score,
            prediction.quality_score,
            prediction.confidence,
        )
        return prediction


prediction_service = PredictionPersistenceService()
