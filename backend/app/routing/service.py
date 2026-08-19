from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, ModelPrediction, ReviewerAssignment


class RoutingService:
    def route(
        self,
        db: Session,
        application: Application,
        prediction: ModelPrediction,
        features: dict[str, float],
        failed_required_documents: bool,
    ) -> ReviewerAssignment:
        db.execute(delete(ReviewerAssignment).where(ReviewerAssignment.application_id == application.id))
        result = self.route_dict(prediction, features, failed_required_documents)
        assignment = ReviewerAssignment(
            application_id=application.id,
            reviewer_role=result["reviewer_role"],
            routing_reason=result["reason"],
            status="ASSIGNED",
        )
        application.ai_recommendation = result["recommendation"]
        db.add(assignment)
        audit_service.record(db, "reviewer_assigned", application_id=application.id, payload=result)
        return assignment

    def route_dict(
        self,
        prediction: ModelPrediction,
        features: dict[str, float],
        failed_required_documents: bool = False,
    ) -> dict[str, Any]:
        risk = prediction.risk_score if prediction.risk_score is not None else 100.0
        confidence = prediction.confidence
        if failed_required_documents:
            return {
                "recommendation": "CLARIFICATION_REQUIRED",
                "reviewer_role": "normal_reviewer",
                "reason": "Required documents are missing; clarification should be requested before final review.",
            }
        if confidence < 0.55:
            return {
                "recommendation": "MANUAL_VERIFICATION_REQUIRED",
                "reviewer_role": "senior_reviewer",
                "reason": "Low AI confidence requires senior manual verification.",
            }
        if risk >= 70:
            return {
                "recommendation": "SENIOR_REVIEW",
                "reviewer_role": "senior_reviewer",
                "reason": "High risk score or severe indicators require senior review.",
            }
        if risk >= 40 or features.get("contradiction_count", 0) > 0:
            return {
                "recommendation": "EXPERT_REVIEW",
                "reviewer_role": "expert_reviewer",
                "reason": "Medium risk or cross-document inconsistency requires expert review.",
            }
        return {
            "recommendation": "NORMAL_REVIEW",
            "reviewer_role": "normal_reviewer",
            "reason": "Low risk and adequate confidence are suitable for normal review.",
        }


routing_service = RoutingService()

