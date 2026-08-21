"""
routing/service.py
==================

Routing decision engine — config-driven thresholds, real reasoning from actual findings.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.config import get_settings
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
            policy_version=result["policy_version"],
        )
        application.ai_recommendation = result["recommendation"]
        db.add(assignment)
        audit_service.record(
            db,
            "reviewer_assigned",
            application_id=application.id,
            payload=result,
        )
        return assignment

    def route_dict(
        self,
        prediction: ModelPrediction,
        features: dict[str, float],
        failed_required_documents: bool = False,
    ) -> dict[str, Any]:
        settings = get_settings()
        risk = prediction.risk_score if prediction.risk_score is not None else 100.0
        confidence = prediction.confidence or 0.0
        contradiction_count = int(features.get("contradiction_count", 0))
        policy_version = settings.routing_policy_version

        triggering_findings: list[str] = []

        if failed_required_documents:
            triggering_findings.append("required_documents_missing")
            return {
                "recommendation": "CLARIFICATION_REQUIRED",
                "reviewer_role": "normal_reviewer",
                "reason": (
                    "Required documents are missing; clarification must be requested "
                    "before routing for substantive review."
                ),
                "triggering_findings": triggering_findings,
                "policy_version": policy_version,
                "risk_score": risk,
                "confidence": confidence,
            }

        if confidence < settings.routing_confidence_threshold:
            triggering_findings.append(f"confidence={confidence:.2f} below threshold={settings.routing_confidence_threshold}")
            return {
                "recommendation": "MANUAL_VERIFICATION_REQUIRED",
                "reviewer_role": "senior_reviewer",
                "reason": (
                    f"AI confidence ({confidence:.2f}) is below the configured threshold "
                    f"({settings.routing_confidence_threshold}). Senior manual verification is required."
                ),
                "triggering_findings": triggering_findings,
                "policy_version": policy_version,
                "risk_score": risk,
                "confidence": confidence,
            }

        if risk >= settings.routing_senior_risk_threshold:
            triggering_findings.append(f"risk_score={risk} >= senior_threshold={settings.routing_senior_risk_threshold}")
            return {
                "recommendation": "SENIOR_REVIEW",
                "reviewer_role": "senior_reviewer",
                "reason": (
                    f"Risk score ({risk}) exceeds the senior-review threshold "
                    f"({settings.routing_senior_risk_threshold}). Senior review is required."
                ),
                "triggering_findings": triggering_findings,
                "policy_version": policy_version,
                "risk_score": risk,
                "confidence": confidence,
            }

        if risk >= settings.routing_expert_risk_threshold or contradiction_count > 0:
            if risk >= settings.routing_expert_risk_threshold:
                triggering_findings.append(f"risk_score={risk} >= expert_threshold={settings.routing_expert_risk_threshold}")
            if contradiction_count > 0:
                triggering_findings.append(f"cross_document_contradictions={contradiction_count}")
            return {
                "recommendation": "EXPERT_REVIEW",
                "reviewer_role": "expert_reviewer",
                "reason": (
                    f"Medium risk score ({risk}) or {contradiction_count} cross-document "
                    "contradiction(s) detected. Expert review is required."
                ),
                "triggering_findings": triggering_findings,
                "policy_version": policy_version,
                "risk_score": risk,
                "confidence": confidence,
            }

        triggering_findings.append("all_thresholds_clear")
        return {
            "recommendation": "NORMAL_REVIEW",
            "reviewer_role": "normal_reviewer",
            "reason": (
                f"Risk score ({risk}) and confidence ({confidence:.2f}) are within "
                "acceptable thresholds. Standard review is appropriate."
            ),
            "triggering_findings": triggering_findings,
            "policy_version": policy_version,
            "risk_score": risk,
            "confidence": confidence,
        }


routing_service = RoutingService()
