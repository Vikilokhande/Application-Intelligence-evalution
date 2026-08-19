from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Application, ModelPrediction, ReviewerAssignment, ReviewerDecision, RuleResult, Scheme


class AnalyticsService:
    def overview(self, db: Session) -> dict[str, object]:
        applications = db.scalars(select(Application)).all()
        decisions = db.scalars(select(ReviewerDecision)).all()
        assignments = db.scalars(select(ReviewerAssignment)).all()
        predictions = db.scalars(select(ModelPrediction)).all()
        failed_rules = db.scalars(select(RuleResult).where(RuleResult.result == "FAIL")).all()
        scheme_names = dict(db.execute(select(Scheme.id, Scheme.name)).all())

        suspicious_count = sum(
            1
            for prediction in predictions
            if prediction.prediction_class in {"MEDIUM_RISK", "HIGH_RISK"} or (prediction.risk_score or 0) >= 40
        )
        created_at_by_id = {application.id: application.created_at for application in applications}
        review_hours = [
            (decision.decided_at - created_at_by_id[decision.application_id]).total_seconds() / 3600
            for decision in decisions
            if decision.application_id in created_at_by_id
        ]
        avg_review_hours = sum(review_hours) / len(review_hours) if review_hours else 0.0
        processing_hours = [
            (application.updated_at - application.created_at).total_seconds() / 3600
            for application in applications
            if application.processing_status
            in {"AWAITING_HUMAN_REVIEW", "HUMAN_REVIEW_COMPLETE", "FAILED"}
        ]
        avg_processing_hours = sum(processing_hours) / len(processing_hours) if processing_hours else 0.0

        return {
            "total_applications": len(applications),
            "applications_by_status": dict(Counter(app.status for app in applications)),
            "average_processing_time_hours": round(float(avg_processing_hours), 2),
            "average_review_time_hours": round(float(avg_review_hours), 2) if avg_review_hours is not None else None,
            "decision_distribution": dict(Counter(decision.decision for decision in decisions)),
            "score_distribution": self._score_distribution(predictions),
            "risk_distribution": dict(Counter(prediction.prediction_class for prediction in predictions)),
            "reviewer_workload": dict(Counter(assignment.reviewer_role for assignment in assignments)),
            "reviewer_performance": self._reviewer_performance(decisions),
            "rule_failure_frequency": dict(Counter(rule.rule_id for rule in failed_rules)),
            "suspicious_application_count": suspicious_count,
            "scheme_statistics": dict(Counter(scheme_names.get(app.scheme_id, "Unassigned") for app in applications)),
        }

    def _score_distribution(self, predictions: list[ModelPrediction]) -> dict[str, int]:
        buckets = Counter()
        for prediction in predictions:
            score = prediction.quality_score
            if score is None:
                buckets["unavailable"] += 1
            elif score >= 80:
                buckets["80-100"] += 1
            elif score >= 60:
                buckets["60-79"] += 1
            elif score >= 40:
                buckets["40-59"] += 1
            else:
                buckets["0-39"] += 1
        return dict(buckets)

    def _reviewer_performance(self, decisions: list[ReviewerDecision]) -> dict[str, dict[str, int]]:
        performance: dict[str, Counter[str]] = {}
        for decision in decisions:
            reviewer = decision.reviewer_id
            performance.setdefault(reviewer, Counter())
            performance[reviewer]["decisions"] += 1
            performance[reviewer][decision.decision.lower()] += 1
            if decision.override_ai_recommendation:
                performance[reviewer]["overrides"] += 1
        return {reviewer: dict(counter) for reviewer, counter in performance.items()}


analytics_service = AnalyticsService()
