from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.models import Application, ReviewerDecision
from app.schemas.application import ReviewRequest


class ReviewService:
    def submit_decision(self, db: Session, application: Application, request: ReviewRequest) -> ReviewerDecision:
        if request.override_ai_recommendation and not request.override_reason:
            raise ValueError("override_reason is required when overriding the AI recommendation.")

        decision = ReviewerDecision(
            application_id=application.id,
            reviewer_id=request.reviewer_id,
            decision=request.decision,
            previous_recommendation=application.ai_recommendation,
            override_ai_recommendation=request.override_ai_recommendation,
            override_reason=request.override_reason,
            comments=request.comments,
        )
        db.add(decision)

        if request.decision == "REQUEST_CLARIFICATION":
            application.status = "CLARIFICATION_REQUESTED"
        else:
            application.status = "HUMAN_DECISION_RECORDED"
        application.processing_status = "HUMAN_REVIEW_COMPLETE"

        audit_service.record(
            db,
            "decision_submitted",
            application_id=application.id,
            actor_id=request.reviewer_id,
            payload={
                "decision": request.decision,
                "previous_recommendation": application.ai_recommendation,
                "override": request.override_ai_recommendation,
            },
        )
        if request.override_ai_recommendation:
            audit_service.record(
                db,
                "ai_overridden",
                application_id=application.id,
                actor_id=request.reviewer_id,
                payload={"reason": request.override_reason},
            )
        return decision


review_service = ReviewService()

