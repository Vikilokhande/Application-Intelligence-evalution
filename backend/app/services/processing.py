from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.explainability.service import explainability_service
from app.extraction.service import document_intelligence_service
from app.features.service import feature_engineering_service
from app.ml.scoring import prediction_service
from app.models import Application, Document, Evidence, ModelPrediction, Scheme
from app.normalization.service import normalization_service
from app.routing.service import routing_service
from app.rules.engine import rule_engine
from app.workflow.state import ApplicationProcessingState, initial_state


class ApplicationProcessingService:
    def process(self, db: Session, application_id: str) -> ApplicationProcessingState:
        application = db.get(Application, application_id)
        if application is None:
            raise ValueError("Application not found")

        documents = db.scalars(select(Document).where(Document.application_id == application.id)).all()
        state = initial_state(application.id, [document.id for document in documents])
        application.processing_status = "PROCESSING"
        application.status = "PROCESSING"
        audit_service.record(db, "processing_started", application_id=application.id)

        try:
            state["current_node"] = "INGEST"
            audit_service.record(db, "ingest_checked", application_id=application.id, payload={"documents": len(documents)})

            state["current_node"] = "CLASSIFY"
            for document in documents:
                document.processing_status = "CLASSIFIED"

            state["current_node"] = "EXTRACT"
            extracted = [document_intelligence_service.process_document(db, document) for document in documents]
            state["extracted_data"] = [item.raw_data for item in extracted]

            state["current_node"] = "NORMALIZE"
            profile_row = normalization_service.normalize(db, application)
            profile = profile_row.profile_json
            state["normalized_profile"] = profile

            state["current_node"] = "VALIDATE"
            scheme = db.get(Scheme, application.scheme_id) if application.scheme_id else None
            validation_results = validation_service_import().validate(db, application, profile, scheme)
            state["validation_results"] = [self._validation_to_dict(item) for item in validation_results]

            state["current_node"] = "RULE_EVALUATION"
            rule_results = rule_engine.evaluate(db, application, profile)
            state["rule_results"] = [self._rule_to_dict(item) for item in rule_results]

            state["current_node"] = "FEATURE_ENGINEERING"
            features = feature_engineering_service.build_features(
                db, application, profile, validation_results, rule_results
            )
            state["features"] = features.features_json

            state["current_node"] = "ML_SCORING"
            prediction = prediction_service.score_and_save(db, application, features.features_json)
            state["ml_prediction"] = self._prediction_to_dict(prediction)

            state["current_node"] = "EXPLAIN"
            state["explanations"] = explainability_service.explain(
                db, application, prediction, validation_results, rule_results
            )

            state["current_node"] = "ROUTE"
            failed_required_documents = any(
                item.validation_type == "REQUIRED_DOCUMENT" and item.status == "FAIL" for item in validation_results
            )
            assignment = routing_service.route(db, application, prediction, features.features_json, failed_required_documents)
            state["routing_result"] = {
                "recommendation": application.ai_recommendation,
                "reviewer_role": assignment.reviewer_role,
                "reason": assignment.routing_reason,
            }

            state["current_node"] = "HUMAN_REVIEW"
            state["review_status"] = "AWAITING_HUMAN_REVIEW"
            state["errors"].append(
                {
                    "code": "WORKFLOW_PAUSED_FOR_HUMAN_REVIEW",
                    "message": "AI processing is complete. Authorized human reviewer must make the final decision.",
                }
            )
            application.status = "AWAITING_HUMAN_REVIEW"
            application.processing_status = "AWAITING_HUMAN_REVIEW"
            state["evidence"] = [self._evidence_to_dict(item) for item in db.scalars(select(Evidence).where(Evidence.application_id == application.id)).all()]
            application.workflow_state = dict(state)
            audit_service.record(db, "workflow_paused_for_human_review", application_id=application.id, payload=state["routing_result"])
            db.commit()
            return state
        except Exception as exc:  # noqa: BLE001
            application.processing_status = "FAILED"
            application.status = "PROCESSING_FAILED"
            state["errors"].append({"code": "PROCESSING_FAILED", "message": str(exc)})
            application.workflow_state = dict(state)
            audit_service.record(db, "processing_failed", application_id=application.id, payload={"error": str(exc)})
            db.commit()
            raise

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


def validation_service_import():
    from app.validation.service import validation_service

    return validation_service


application_processing_service = ApplicationProcessingService()

