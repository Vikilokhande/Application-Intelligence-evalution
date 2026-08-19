from sqlalchemy import select

from app.features.service import feature_engineering_service
from app.ml.scoring import MockScoringService
from app.models import Application, ModelPrediction, RuleResult, Scheme, ValidationResult
from app.routing.service import routing_service
from app.rules.engine import rule_engine
from app.schemas.application import ApplicationCreate
from app.workflow.graph import application_workflow_graph
from app.workflow.state import WORKFLOW_NODES, initial_state


def test_schema_validation_accepts_application_payload():
    payload = ApplicationCreate(
        applicant_name="Riverbend Municipal Council",
        project_title="Canal Edge Urban Greening",
        form_data={"project_cost": 4_800_000, "duration_months": 18},
    )
    assert payload.form_data["project_cost"] == 4_800_000


def test_financial_rule_fails_when_cost_exceeds_scheme_limit(db_session):
    scheme = db_session.scalars(select(Scheme)).first()
    application = Application(
        scheme_id=scheme.id,
        applicant_name="Horizon Civic Works",
        project_title="High Value Restoration",
        form_data={},
    )
    db_session.add(application)
    db_session.flush()

    profile = {
        "financial": {"project_cost": {"selected_value": 5_500_000}},
        "timeline": {"duration_months": {"selected_value": 12}},
        "applicant": {"organization_type": {"selected_value": "Registered NGO"}},
        "project": {"category": {"selected_value": "Urban Greening"}},
    }
    results = rule_engine.evaluate(db_session, application, profile)
    cost_rule = next(item for item in results if item.rule_id == "PROJECT_COST_LIMIT")
    assert cost_rule.result == "FAIL"
    assert cost_rule.actual_value["value"] == 5_500_000


def test_feature_engineering_counts_completeness_and_contradictions():
    validation_results = [
        ValidationResult(validation_type="REQUIRED_FIELD", status="PASS", message="ok", severity="INFO"),
        ValidationResult(validation_type="REQUIRED_FIELD", status="FAIL", message="missing", severity="ERROR"),
        ValidationResult(validation_type="REQUIRED_DOCUMENT", status="FAIL", message="missing", severity="ERROR", evidence={"required": ["A", "B"], "missing": ["B"]}),
        ValidationResult(validation_type="CROSS_DOCUMENT_CONSISTENCY", status="FAIL", message="contradiction", severity="ERROR"),
        ValidationResult(validation_type="SUSPICIOUS_INDICATOR", status="WARN", message="risk", severity="WARNING", evidence={"indicators": ["Low extraction confidence"]}),
    ]
    rule_results = [
        RuleResult(rule_id="R1", rule_name="Rule 1", result="PASS", reason="ok"),
        RuleResult(rule_id="R2", rule_name="Rule 2", result="FAIL", reason="bad"),
    ]
    profile = {"extraction_metadata": {"average_confidence": 0.75}, "environmental_attributes": {"benefit": {"selected_value": "Trees"}}}
    features = feature_engineering_service.to_feature_dict(profile, validation_results, rule_results)
    assert features["required_field_completeness"] == 0.5
    assert features["document_completeness"] == 0.5
    assert features["contradiction_count"] == 1.0


def test_mock_scoring_is_labeled_development_model():
    result = MockScoringService().score(
        {
            "document_completeness": 1,
            "required_field_completeness": 1,
            "eligibility_pass_ratio": 1,
            "budget_consistency": 1,
            "contradiction_count": 0,
            "duplicate_similarity": 0,
            "suspicious_indicator_count": 0,
            "environmental_impact": 0.7,
            "proposal_quality": 0.8,
            "extraction_confidence": 0.85,
        }
    )
    assert result["status"] == "GENERATED_DEVELOPMENT_MODEL"
    assert result["prediction_class"] == "LOW_RISK"


def test_routing_sends_medium_risk_to_expert_review():
    prediction = ModelPrediction(
        application_id="app",
        model_name="mock",
        risk_score=45,
        quality_score=60,
        confidence=0.8,
        prediction_class="MEDIUM_RISK",
    )
    route = routing_service.route_dict(prediction, {"contradiction_count": 1}, failed_required_documents=False)
    assert route["recommendation"] == "EXPERT_REVIEW"
    assert route["reviewer_role"] == "expert_reviewer"


def test_langgraph_workflow_skeleton_is_ordered_and_available():
    state = initial_state("app-1", ["doc-1"])
    assert state["current_node"] == "INGEST"
    assert WORKFLOW_NODES[:3] == ["INGEST", "CLASSIFY", "EXTRACT"]
    assert "HUMAN_REVIEW" in application_workflow_graph.nodes()
    assert isinstance(application_workflow_graph.is_available(), bool)

