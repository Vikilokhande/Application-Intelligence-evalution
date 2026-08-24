"""
explainability/service.py
==========================

Real explainability — traces every finding back to:
  document → extracted field → normalization → validation/rule → feature → prediction

All contributions come from actual model output.
Knowledge base is queried for relevant policy context.
Never invents contribution values.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.ml.scoring import FEATURE_NAMES
from app.models import Application, Evidence, ModelPrediction, RuleResult, ValidationResult

logger = logging.getLogger(__name__)


class ExplainabilityService:
    def explain(
        self,
        db: Session,
        application: Application,
        prediction: ModelPrediction,
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
    ) -> dict[str, Any]:
        failed_rules = [r for r in rule_results if r.result in {"FAIL", "ERROR"}]
        failed_validations = [v for v in validation_results if v.status in {"FAIL", "WARN"}]

        # Feature contributions from actual model (sorted by absolute value)
        contributions = prediction.feature_contributions or {}
        top_contributions = sorted(
            [
                (name, float(contributions[name]))
                for name in FEATURE_NAMES
                if name in contributions and contributions[name] is not None
            ],
            key=lambda item: abs(item[1]),
            reverse=True,
        )[:5]

        # Determine if ML was real or unavailable
        is_ml_active = prediction.prediction_class not in ("UNAVAILABLE",)
        is_baseline = "baseline" in (prediction.provider or "") or "DEVELOPMENT" in (prediction.status or "")

        model_note = (
            "XGBoost model prediction — decision support only; final decision requires human reviewer."
            if is_ml_active and not is_baseline
            else (
                "Baseline/deterministic scoring — model not yet trained. Results are development estimates only."
                if is_baseline
                else "ML scoring unavailable — no trained model. Human review should be based on raw validation findings."
            )
        )

        # Build full evidence trace: document → field → prediction
        evidence_trace = []
        for val_result in failed_validations:
            trace_entry = {
                "stage": "VALIDATION",
                "finding_type": val_result.validation_type,
                "status": val_result.status,
                "message": val_result.message,
                "evidence": val_result.evidence,
                "severity": val_result.severity,
            }
            evidence_trace.append(trace_entry)

        for rule in failed_rules:
            evidence_trace.append({
                "stage": "RULE_EVALUATION",
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "result": rule.result,
                "expected": rule.expected_value,
                "actual": rule.actual_value,
                "reason": rule.reason,
                "severity": rule.severity,
            })

        # Contradictions specifically
        contradictions = [
            v for v in validation_results
            if v.validation_type == "CROSS_DOCUMENT_CONSISTENCY" and v.status == "FAIL"
        ]

        # Suspicious indicators
        suspicious = [
            item
            for v in validation_results
            if v.validation_type == "SUSPICIOUS_INDICATOR" and v.status in {"FAIL", "WARN"}
            for item in (v.evidence or {}).get("indicators", [])
        ]

        # Retrieve relevant knowledge/policy evidence
        policy_evidence: list[dict[str, Any]] = []
        if failed_rules:
            try:
                from app.knowledge.service import knowledge_base
                for rule in failed_rules[:2]:  # limit KB queries
                    query = f"{rule.rule_name} policy limit"
                    results = knowledge_base.query(query, limit=2)
                    for kb_result in results:
                        if kb_result.get("text"):
                            policy_evidence.append({
                                "rule_id": rule.rule_id,
                                "source": kb_result.get("source"),
                                "scheme": kb_result.get("scheme"),
                                "excerpt": kb_result.get("text", "")[:400],
                                "score": kb_result.get("score"),
                            })
            except Exception as exc:
                logger.warning("Knowledge base query failed during explanation: %s", exc)

        explanation = {
            "recommendation_context": {
                "prediction_class": prediction.prediction_class,
                "quality_score": prediction.quality_score,
                "risk_score": prediction.risk_score,
                "confidence": prediction.confidence,
                "model_name": prediction.model_name,
                "model_version": prediction.model_version,
                "provider": prediction.provider or "unknown",
                "status": prediction.status,
                "note": model_note,
            },
            "top_feature_contributions": [
                {"feature": name, "contribution": val}
                for name, val in top_contributions
            ],
            "failed_rules": [
                {
                    "rule_id": r.rule_id,
                    "rule_name": r.rule_name,
                    "result": r.result,
                    "expected": r.expected_value,
                    "actual": r.actual_value,
                    "reason": r.reason,
                }
                for r in failed_rules
            ],
            "validation_findings": [
                {
                    "type": v.validation_type,
                    "status": v.status,
                    "message": v.message,
                    "severity": v.severity,
                }
                for v in failed_validations
            ],
            "contradictions": [
                {"message": c.message, "evidence": c.evidence}
                for c in contradictions
            ],
            "suspicious_indicators": suspicious,
            "evidence_trace": evidence_trace,
            "policy_evidence": policy_evidence,
        }

        # Persist explanation as evidence record
        db.add(
            Evidence(
                application_id=application.id,
                finding_type="MODEL_EXPLANATION",
                source=prediction.model_name or "unknown",
                locator="feature_contributions",
                field_name="risk_score",
                extracted_value=str(prediction.risk_score),
                confidence=prediction.confidence,
                metadata_json=explanation,
            )
        )

        audit_service.record(
            db,
            "explanation_generated",
            application_id=application.id,
            payload={
                "prediction_class": prediction.prediction_class,
                "failed_rules": [r.rule_id for r in failed_rules],
                "contradictions": len(contradictions),
                "policy_evidence_count": len(policy_evidence),
                "model_name": prediction.model_name,
            },
        )
        return explanation


explainability_service = ExplainabilityService()
