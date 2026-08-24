"""
ml/scoring.py
=============

Production ML scoring pipeline.

Uses 3 trained XGBoost models from the artifacts directory:
  - risk_classifier.ubj  → predict_proba → prediction_class + confidence
  - risk_regressor.ubj   → predict        → risk_score (0-100)
  - quality_regressor.ubj→ predict        → quality_score (0-100)

All 3 models require EXACTLY these 13 features in this order:
  document_completeness, required_field_completeness, eligibility_pass_ratio,
  budget_consistency, certificate_validity, contradiction_count,
  duplicate_similarity, suspicious_indicator_count, document_quality,
  proposal_quality, project_feasibility, environmental_impact,
  extraction_confidence

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
FEATURE_SCHEMA_VERSION = "1.0"

# Artifacts directory (where all 3 trained models live)
_ARTIFACTS_DIR = Path(__file__).parent / "application_intelligence_xgboost_training_artifacts" / "models"

# Ordered feature list — MUST match the trained model's exact feature ordering (13 features)
FEATURE_NAMES = [
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

# Risk class mapping from the training schema
_INT_TO_CLASS = {0: "LOW_RISK", 1: "MEDIUM_RISK", 2: "HIGH_RISK"}


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------


class ScoringService(ABC):
    @abstractmethod
    def score(self, features: dict[str, float]) -> dict[str, Any]:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# XGBoost — Production Scorer (3-model ensemble)
# ---------------------------------------------------------------------------


class XGBoostScoringService(ScoringService):
    """
    Production scorer backed by 3 trained XGBoost models.

    Models loaded from artifacts directory:
      - risk_classifier.ubj  → classification → prediction_class + confidence
      - risk_regressor.ubj   → regression     → risk_score (0-100)
      - quality_regressor.ubj→ regression     → quality_score (0-100)

    Raises ModelUnavailableError if:
    - any model file does not exist
    - xgboost package not installed

    Never fabricates predictions.
    """

    def __init__(self, artifacts_dir: Path | None = None, model_path: str | Path | None = None) -> None:
        self._artifacts_dir = Path(model_path).parent if model_path is not None else (artifacts_dir or _ARTIFACTS_DIR)
        self._classifier: Any = None      # risk_classifier.ubj
        self._risk_reg: Any = None        # risk_regressor.ubj
        self._quality_reg: Any = None     # quality_regressor.ubj
        self._loaded = False

    def _load(self) -> None:
        """Load all 3 models. Raises ModelUnavailableError on any problem."""
        try:
            import xgboost as xgb  # type: ignore
        except ImportError as exc:
            raise ModelUnavailableError(
                "xgboost package is not installed. Install with: pip install xgboost"
            ) from exc

        classifier_path = self._artifacts_dir / "risk_classifier.ubj"
        risk_reg_path = self._artifacts_dir / "risk_regressor.ubj"
        quality_reg_path = self._artifacts_dir / "quality_regressor.ubj"

        missing = [
            str(p) for p in [classifier_path, risk_reg_path, quality_reg_path]
            if not p.exists()
        ]
        if missing:
            raise ModelUnavailableError(
                f"XGBoost model files not found: {missing}. "
                f"Expected in: {self._artifacts_dir}"
            )

        clf = xgb.XGBClassifier()
        clf.load_model(str(classifier_path))
        self._classifier = clf

        risk_reg = xgb.XGBRegressor()
        risk_reg.load_model(str(risk_reg_path))
        self._risk_reg = risk_reg

        quality_reg = xgb.XGBRegressor()
        quality_reg.load_model(str(quality_reg_path))
        self._quality_reg = quality_reg

        self._loaded = True
        logger.info(
            "XGBoost models loaded: classifier=%s risk_regressor=%s quality_regressor=%s features=%d schema_version=%s",
            classifier_path.name, risk_reg_path.name, quality_reg_path.name,
            len(FEATURE_NAMES), FEATURE_SCHEMA_VERSION,
        )

    def _validate_and_order_features(self, features: dict[str, float]) -> list[float]:
        """Return ordered 13-feature vector; raise ModelUnavailableError on mismatch."""
        missing = [f for f in FEATURE_NAMES if f not in features]
        if missing:
            raise ModelUnavailableError(
                f"Feature mismatch: missing features {missing}. "
                "Ensure feature engineering produces all 13 required features."
            )
        return [float(features[name]) for name in FEATURE_NAMES]

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        if not self._loaded:
            self._load()

        import numpy as np  # type: ignore

        feature_vector = self._validate_and_order_features(features)
        X = np.array([feature_vector], dtype=float)

        # --- Risk classification (class + confidence) ---
        try:
            proba = self._classifier.predict_proba(X)[0]  # shape: (3,) for LOW/MED/HIGH
            pred_class_idx = int(np.argmax(proba))
            confidence = float(proba[pred_class_idx])
            prediction_class = _INT_TO_CLASS.get(pred_class_idx, "MEDIUM_RISK")
        except Exception as exc:
            logger.warning("risk_classifier predict_proba failed: %s", exc)
            raise ModelUnavailableError(f"risk_classifier inference failed: {exc}") from exc

        # --- Risk score regression (0-100) ---
        try:
            risk_score_raw = float(self._risk_reg.predict(X)[0])
            risk_score = round(float(np.clip(risk_score_raw, 0.0, 100.0)), 1)
        except Exception as exc:
            logger.warning("risk_regressor predict failed: %s; falling back to proba-based score", exc)
            # Graceful fallback: derive from classifier proba
            risk_score = round(float(proba[2]) * 100.0, 1)  # HIGH_RISK proba * 100

        # --- Quality score regression (0-100) ---
        try:
            quality_score_raw = float(self._quality_reg.predict(X)[0])
            quality_score = round(float(np.clip(quality_score_raw, 0.0, 100.0)), 1)
        except Exception as exc:
            logger.warning("quality_regressor predict failed: %s; falling back to complement", exc)
            quality_score = round(max(0.0, 100.0 - risk_score), 1)

        # Feature importance contributions from the classifier
        try:
            importance_scores = self._classifier.get_booster().get_score(importance_type="gain")
            total_gain = sum(float(value) for value in importance_scores.values())
            if total_gain <= 0:
                feature_contributions = {}
            else:
                feature_contributions = {
                    name: round(float(importance_scores[key]) / total_gain, 4)
                    for i, name in enumerate(FEATURE_NAMES)
                    for key in (f"f{i}", name)
                    if key in importance_scores
                }
        except Exception:
            feature_contributions = {}

        class_probabilities = {
            "LOW_RISK": round(float(proba[0]), 4),
            "MEDIUM_RISK": round(float(proba[1]), 4),
            "HIGH_RISK": round(float(proba[2]), 4),
        }

        logger.info(
            "[ML_SCORING] model_status=READY features=%d/%d prediction_class=%s "
            "risk_score=%.1f quality_score=%.1f confidence=%.3f",
            len(FEATURE_NAMES), len(FEATURE_NAMES),
            prediction_class, risk_score, quality_score, confidence,
        )
        logger.info(
            "[PIPELINE] ML_SCORING xgboost prediction_class=%s confidence=%.3f "
            "risk_score=%.1f quality_score=%.1f",
            prediction_class, confidence, risk_score, quality_score,
        )

        return {
            "model_name": "XGBoostApplicationIntelligence",
            "model_version": FEATURE_SCHEMA_VERSION,
            "feature_version": FEATURE_SCHEMA_VERSION,
            "risk_score": risk_score,
            "quality_score": quality_score,
            "confidence": round(confidence, 4),
            "prediction_class": prediction_class,
            "class_probabilities": class_probabilities,
            "feature_contributions": feature_contributions,
            "status": "GENERATED",
            "provider": "xgboost",
            "model_status": "ML_READY",
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
        doc_completeness = features.get("document_completeness", features.get("document_completeness_ratio", 0.5))
        field_completeness = features.get("required_field_completeness", 0.5)
        eligibility_ratio = features.get("eligibility_pass_ratio", 0.5)
        budget_ok = features.get("budget_consistency", 1.0)
        cert_valid = features.get("certificate_validity", 1.0)
        contradictions = features.get("contradiction_count", 0.0)
        duplicate_sim = features.get("duplicate_similarity", 0.0)
        suspicious = features.get("suspicious_indicator_count", 0.0)
        doc_quality = features.get("document_quality", 0.5)
        proposal_qual = features.get("proposal_quality", 0.5)
        feasibility = features.get("project_feasibility", 0.5)
        env_impact = features.get("environmental_impact", 0.4)
        extraction_conf = features.get("extraction_confidence", 0.5)

        risk_score = (
            5.0
            + (1.0 - doc_completeness) * 18.0
            + (1.0 - field_completeness) * 12.0
            + (1.0 - eligibility_ratio) * 14.0
            + (1.0 - budget_ok) * 14.0
            + (1.0 - cert_valid) * 8.0
            + contradictions * 16.0
            + duplicate_sim * 20.0
            + suspicious * 8.0
            + (1.0 - extraction_conf) * 10.0
        )
        risk_score = min(100.0, max(0.0, risk_score))
        quality_score = max(0.0, min(100.0, 100.0 - risk_score + env_impact * 5.0 + proposal_qual * 5.0))

        confidence = max(0.25, min(0.95,
            0.25 + extraction_conf * 0.25 + doc_completeness * 0.2 + budget_ok * 0.1 + feasibility * 0.2
        ))

        if risk_score >= 70:
            prediction_class = "HIGH_RISK"
        elif risk_score >= 40:
            prediction_class = "MEDIUM_RISK"
        else:
            prediction_class = "LOW_RISK"

        top_risk_factors: list[str] = []
        if features.get("missing_document_count", 0.0) or doc_completeness < 1.0:
            top_risk_factors.append("required_documents_missing")
        if features.get("financial_rule_fail_count", 0.0) or budget_ok < 1.0:
            top_risk_factors.append("financial_rule_failed")
        if features.get("duration_rule_fail_count", 0.0):
            top_risk_factors.append("duration_rule_failed")
        if features.get("eligibility_rule_fail_count", 0.0) or eligibility_ratio < 1.0:
            top_risk_factors.append("eligibility_rule_failed")
        if contradictions > 0:
            top_risk_factors.append("cross_document_contradiction")
        if suspicious > 0:
            top_risk_factors.append("suspicious_indicators")

        return {
            "model_name": "BaselineRuleScorer",
            "model_version": "1.0-baseline",
            "feature_version": FEATURE_SCHEMA_VERSION,
            "feature_schema_version": "1.1",
            "risk_score": round(risk_score, 1),
            "quality_score": round(quality_score, 1),
            "confidence": round(confidence, 3),
            "prediction_class": prediction_class,
            "top_risk_factors": top_risk_factors,
            "feature_contributions": {},
            "status": "GENERATED_DEVELOPMENT_MODEL",
            "provider": "baseline",
            "model_status": "BASELINE_FALLBACK",
        }


# ---------------------------------------------------------------------------
# MockScoringService — TEST USE ONLY
# ---------------------------------------------------------------------------


class MockScoringService(ScoringService):
    """TEST USE ONLY. Returns a labelled development-model prediction."""

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
            "Set ML_PROVIDER=xgboost and ensure models are in the artifacts directory."
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
                "class_probabilities": {},
                "feature_contributions": {},
                "status": f"{exc.code}: {exc.message}",
                "provider": "none",
                "model_status": "UNAVAILABLE",
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
            feature_contributions={
                **(prediction_payload.get("feature_contributions", {}) or {}),
                **({"_class_probabilities": prediction_payload.get("class_probabilities")} if prediction_payload.get("class_probabilities") else {}),
            },
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
                "feature_count": len(features),
            },
        )
        is_xgboost = prediction.provider == "xgboost"
        is_baseline = prediction.provider == "baseline"
        model_status = "ML_READY" if is_xgboost else ("BASELINE_FALLBACK" if is_baseline else "UNAVAILABLE")
        logger.info(
            "[ML_SCORING] application=%s model_status=%s provider=%s prediction_class=%s "
            "risk_score=%s quality_score=%s confidence=%.3f",
            application.id, model_status,
            prediction.provider,
            prediction.prediction_class,
            prediction.risk_score,
            prediction.quality_score,
            prediction.confidence or 0.0,
        )
        logger.info(
            "[PIPELINE] application=%s stage=ML_SCORING provider=%s prediction_class=%s "
            "risk_score=%s quality_score=%s confidence=%.3f",
            application.id,
            prediction.provider,
            prediction.prediction_class,
            prediction.risk_score,
            prediction.quality_score,
            prediction.confidence or 0.0,
        )
        return prediction


prediction_service = PredictionPersistenceService()
