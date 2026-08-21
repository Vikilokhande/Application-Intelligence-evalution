"""
services/processing.py
=======================

Main application processing pipeline coordinator.

Executes the full pipeline in sequence:
  INGEST → EXTRACT → NORMALIZE → VALIDATE → RULE_EVALUATION
  → FEATURE_ENGINEERING → ML_SCORING → LLM_REASONING → EXPLAIN → ROUTE
  → HUMAN_REVIEW (pause for human decision)

Every stage is logged with timing, recorded in audit trail, and
state is persisted to the database.

Failures are caught per stage where safe and recorded explicitly.
Never converts exceptions into fake success.
"""

import logging
import time
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.explainability.service import explainability_service
from app.extraction.service import document_intelligence_service
from app.features.service import feature_engineering_service
from app.llm_reasoning.service import llm_reasoning_service
from app.ml.scoring import prediction_service
from app.models import Application, Document, Evidence, ModelPrediction, Scheme
from app.normalization.service import normalization_service
from app.routing.service import routing_service
from app.rules.engine import rule_engine
from app.workflow.state import ApplicationProcessingState, initial_state

logger = logging.getLogger(__name__)


def _stage_start(application_id: str, stage: str, **extra: Any) -> float:
    parts = " ".join(f"{k}={v}" for k, v in extra.items())
    logger.info("[PIPELINE] application=%s stage=%s status=STARTED%s", application_id, stage, f" {parts}" if parts else "")
    return time.monotonic()


def _stage_done(application_id: str, stage: str, t0: float, **extra: Any) -> int:
    ms = round((time.monotonic() - t0) * 1000)
    parts = " ".join(f"{k}={v}" for k, v in extra.items())
    logger.info(
        "[PIPELINE] application=%s stage=%s status=COMPLETED duration_ms=%d%s",
        application_id, stage, ms, f" {parts}" if parts else "",
    )
    return ms


def _stage_fail(application_id: str, stage: str, t0: float, exc: Exception) -> int:
    ms = round((time.monotonic() - t0) * 1000)
    logger.error(
        "[PIPELINE] application=%s stage=%s status=FAILED duration_ms=%d error=%s",
        application_id, stage, ms, exc,
    )
    return ms


class ApplicationProcessingService:
    def process(self, db: Session, application_id: str) -> ApplicationProcessingState:
        application = db.get(Application, application_id)
        if application is None:
            raise ValueError("Application not found")

        documents = db.scalars(
            select(Document).where(Document.application_id == application.id)
        ).all()
        state = initial_state(application.id, [doc.id for doc in documents])
        application.processing_status = "PROCESSING"
        application.status = "PROCESSING"
        audit_service.record(
            db, "processing_started",
            application_id=application.id,
            payload={"document_count": len(documents)},
        )
        logger.info(
            "[PIPELINE] application=%s status=STARTED documents=%d",
            application.id, len(documents),
        )

        try:
            # ── Stage: INGEST ────────────────────────────────────────────────
            t0 = _stage_start(application.id, "INGEST", documents=len(documents))
            state["current_node"] = "INGEST"
            audit_service.record(
                db, "ingest_checked",
                application_id=application.id,
                payload={"documents": len(documents)},
            )
            _stage_done(application.id, "INGEST", t0, documents=len(documents))

            # ── Stage: EXTRACT ───────────────────────────────────────────────
            t0 = _stage_start(application.id, "EXTRACT")
            state["current_node"] = "EXTRACT"
            extracted_all = []
            for doc in documents:
                doc_t0 = time.monotonic()
                logger.info(
                    "[PIPELINE] application=%s stage=OCR document=%s status=STARTING",
                    application.id, doc.id,
                )
                try:
                    extracted = document_intelligence_service.process_document(db, doc)
                    extracted_all.append(extracted)
                    doc_ms = round((time.monotonic() - doc_t0) * 1000)
                    logger.info(
                        "[PIPELINE] application=%s stage=EXTRACT document=%s "
                        "provider=%s type=%s confidence=%.3f status=COMPLETED duration_ms=%d",
                        application.id, doc.id,
                        (extracted.raw_data or {}).get("extraction_method", "unknown"),
                        doc.document_type,
                        extracted.confidence or 0.0,
                        doc_ms,
                    )
                except Exception as doc_exc:
                    doc_ms = round((time.monotonic() - doc_t0) * 1000)
                    logger.error(
                        "[PIPELINE] application=%s stage=EXTRACT document=%s "
                        "status=FAILED duration_ms=%d error=%s",
                        application.id, doc.id, doc_ms, doc_exc,
                    )
                    raise

            state["extracted_data"] = [item.raw_data for item in extracted_all]
            _stage_done(
                application.id, "EXTRACT", t0,
                documents=len(extracted_all),
                providers=",".join({
                    (item.raw_data or {}).get("extraction_method", "unknown")
                    for item in extracted_all
                }),
            )

            # ── Stage: NORMALIZE ─────────────────────────────────────────────
            t0 = _stage_start(application.id, "NORMALIZE")
            state["current_node"] = "NORMALIZE"
            profile_row = normalization_service.normalize(db, application)
            profile = profile_row.profile_json
            state["normalized_profile"] = profile
            avg_conf = profile.get("extraction_metadata", {}).get("average_confidence", 0.0)
            _stage_done(application.id, "NORMALIZE", t0, avg_confidence=f"{avg_conf:.3f}")

            # ── Stage: VALIDATE ──────────────────────────────────────────────
            t0 = _stage_start(application.id, "VALIDATE")
            state["current_node"] = "VALIDATE"
            from app.validation.service import validation_service
            scheme = db.get(Scheme, application.scheme_id) if application.scheme_id else None
            validation_results = validation_service.validate(db, application, profile, scheme)
            state["validation_results"] = [self._validation_to_dict(r) for r in validation_results]
            v_pass = sum(1 for r in validation_results if r.status == "PASS")
            v_warn = sum(1 for r in validation_results if r.status == "WARN")
            v_fail = sum(1 for r in validation_results if r.status == "FAIL")
            _stage_done(
                application.id, "VALIDATE", t0,
                rules=len(validation_results),
                passed=v_pass,
                warnings=v_warn,
                failed=v_fail,
            )

            # ── Stage: RULE_EVALUATION ───────────────────────────────────────
            t0 = _stage_start(application.id, "RULE_EVALUATION")
            state["current_node"] = "RULE_EVALUATION"
            rule_results = rule_engine.evaluate(db, application, profile)
            state["rule_results"] = [self._rule_to_dict(r) for r in rule_results]
            r_pass = sum(1 for r in rule_results if r.result == "PASS")
            r_fail = sum(1 for r in rule_results if r.result == "FAIL")
            _stage_done(
                application.id, "RULE_EVALUATION", t0,
                rules=len(rule_results), passed=r_pass, failed=r_fail,
            )

            # ── Stage: FEATURE_ENGINEERING ───────────────────────────────────
            t0 = _stage_start(application.id, "FEATURE_ENGINEERING")
            state["current_node"] = "FEATURE_ENGINEERING"
            feature_set = feature_engineering_service.build_features(
                db, application, profile, validation_results, rule_results
            )
            state["features"] = feature_set.features_json
            _stage_done(
                application.id, "FEATURE_ENGINEERING", t0,
                features=len(feature_set.features_json),
                version=feature_set.feature_version,
            )

            # ── Stage: ML_SCORING ────────────────────────────────────────────
            t0 = _stage_start(application.id, "ML_SCORING")
            state["current_node"] = "ML_SCORING"
            prediction = prediction_service.score_and_save(
                db, application, feature_set.features_json
            )
            state["ml_prediction"] = self._prediction_to_dict(prediction)
            _stage_done(
                application.id, "ML_SCORING", t0,
                provider=prediction.provider or "unknown",
                prediction_class=prediction.prediction_class or "UNAVAILABLE",
                risk_score=prediction.risk_score if prediction.risk_score is not None else "N/A",
                quality_score=prediction.quality_score if prediction.quality_score is not None else "N/A",
                confidence=f"{prediction.confidence:.3f}" if prediction.confidence else "0.000",
            )

            # ── Stage: LLM_REASONING ─────────────────────────────────────────
            t0 = _stage_start(application.id, "LLM_REASONING")
            state["current_node"] = "LLM_REASONING"
            llm_reasoning = llm_reasoning_service.reason(
                db=db,
                application=application,
                profile=profile,
                validation_results=validation_results,
                rule_results=rule_results,
                features=feature_set.features_json,
                prediction=prediction,
            )
            state["llm_reasoning"] = llm_reasoning
            # LLM stage timing is already logged inside the service; just record state
            logger.info(
                "[PIPELINE] application=%s stage=LLM_REASONING llm_status=%s",
                application.id, llm_reasoning.get("status"),
            )
            _stage_done(
                application.id,
                "LLM_REASONING",
                t0,
                provider=llm_reasoning.get("provider", "unknown"),
                recommendation=llm_reasoning.get("recommendation", "UNAVAILABLE"),
                confidence=llm_reasoning.get("llm_confidence", 0.0),
            )

            # ── Stage: EXPLAIN ───────────────────────────────────────────────
            t0 = _stage_start(application.id, "EXPLAIN")
            state["current_node"] = "EXPLAIN"
            explanation = explainability_service.explain(
                db, application, prediction, validation_results, rule_results
            )
            # Attach LLM reasoning into explanation for reviewer
            explanation["llm_reasoning"] = llm_reasoning
            state["explanations"] = explanation
            _stage_done(
                application.id, "EXPLAIN", t0,
                failed_rules=len(explanation.get("failed_rules", [])),
                contradictions=len(explanation.get("contradictions", [])),
            )

            # ── Stage: ROUTE ─────────────────────────────────────────────────
            t0 = _stage_start(application.id, "ROUTE")
            state["current_node"] = "ROUTE"
            failed_required_documents = any(
                r.validation_type == "REQUIRED_DOCUMENT" and r.status == "FAIL"
                for r in validation_results
            )
            assignment = routing_service.route(
                db, application, prediction, feature_set.features_json, failed_required_documents
            )
            state["routing_result"] = {
                "recommendation": application.ai_recommendation,
                "reviewer_role": assignment.reviewer_role,
                "reason": assignment.routing_reason,
            }
            _stage_done(
                application.id, "ROUTE", t0,
                route=assignment.reviewer_role,
                recommendation=application.ai_recommendation or "UNKNOWN",
                priority="HIGH" if (prediction.risk_score or 0) >= 70 else "MEDIUM",
            )

            # ── Stage: HUMAN_REVIEW (checkpoint) ─────────────────────────────
            state["current_node"] = "HUMAN_REVIEW"
            state["review_status"] = "AWAITING_HUMAN_REVIEW"
            state["errors"].append({
                "code": "WORKFLOW_PAUSED_FOR_HUMAN_REVIEW",
                "message": (
                    "AI processing is complete. Authorized human reviewer must make the final decision. "
                    "The AI recommendation is advisory only."
                ),
            })
            application.status = "AWAITING_HUMAN_REVIEW"
            application.processing_status = "AWAITING_HUMAN_REVIEW"

            # Gather evidence for state
            all_evidence = db.scalars(
                select(Evidence).where(Evidence.application_id == application.id)
            ).all()
            state["evidence"] = [self._evidence_to_dict(e) for e in all_evidence]
            application.workflow_state = dict(state)

            audit_service.record(
                db,
                "workflow_paused_for_human_review",
                application_id=application.id,
                payload={
                    **state["routing_result"],
                    "llm_reasoning_status": llm_reasoning.get("status"),
                    "risk_score": prediction.risk_score,
                    "prediction_class": prediction.prediction_class,
                },
            )

            logger.info(
                "[PIPELINE] application=%s status=AWAITING_HUMAN_REVIEW "
                "reviewer_role=%s recommendation=%s",
                application.id,
                assignment.reviewer_role,
                application.ai_recommendation,
            )
            db.commit()
            return state

        except Exception as exc:
            application.processing_status = "FAILED"
            application.status = "PROCESSING_FAILED"
            state["errors"].append({"code": "PROCESSING_FAILED", "message": str(exc)})
            application.workflow_state = dict(state)
            audit_service.record(
                db, "processing_failed",
                application_id=application.id,
                payload={
                    "error": str(exc),
                    "failed_at_node": state.get("current_node", "UNKNOWN"),
                },
            )
            logger.error(
                "[PIPELINE] application=%s status=FAILED node=%s error=%s",
                application.id, state.get("current_node", "UNKNOWN"), exc,
            )
            db.commit()
            raise

    # ── Serialization helpers ─────────────────────────────────────────────────

    def _validation_to_dict(self, item: Any) -> dict[str, Any]:
        return {
            "validation_type": item.validation_type,
            "status": item.status,
            "message": item.message,
            "severity": item.severity,
            "evidence": item.evidence,
        }

    def _rule_to_dict(self, item: Any) -> dict[str, Any]:
        return {
            "rule_id": item.rule_id,
            "rule_name": item.rule_name,
            "result": item.result,
            "expected_value": item.expected_value,
            "actual_value": item.actual_value,
            "reason": item.reason,
            "evidence": item.evidence,
            "severity": item.severity,
        }

    def _prediction_to_dict(self, item: ModelPrediction) -> dict[str, Any]:
        return {
            "model_name": item.model_name,
            "model_version": item.model_version,
            "quality_score": item.quality_score,
            "risk_score": item.risk_score,
            "confidence": item.confidence,
            "prediction_class": item.prediction_class,
            "feature_contributions": item.feature_contributions,
            "status": item.status,
            "provider": item.provider,
        }

    def _evidence_to_dict(self, item: Evidence) -> dict[str, Any]:
        return {
            "id": item.id,
            "document_id": item.document_id,
            "finding_type": item.finding_type,
            "source": item.source,
            "locator": item.locator,
            "field_name": item.field_name,
            "extracted_value": item.extracted_value,
            "confidence": item.confidence,
            "metadata": item.metadata_json,
        }


application_processing_service = ApplicationProcessingService()
