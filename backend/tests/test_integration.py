from io import BytesIO

from fastapi.testclient import TestClient

from app.core.exceptions import ModelUnavailableError
from app.db.session import SessionLocal
from app.main import app
from app.ml.scoring import PredictionPersistenceService, ScoringService
from app.models import Application, Evidence, ModelPrediction, Scheme


def _upload(client: TestClient, application_id: str, filename: str, text: str):
    return client.post(
        f"/api/v1/applications/{application_id}/documents",
        files={"file": (filename, BytesIO(text.encode("utf-8")), "text/plain")},
    )


def test_upload_process_detects_budget_contradiction_and_records_review():
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/applications",
            json={
                "applicant_name": "Eastbank Green Forum",
                "project_title": "School Rain Garden Network",
                "project_category": "Water Conservation",
                "form_data": {
                    "applicant_name": "Eastbank Green Forum",
                    "organization_type": "Registered NGO",
                    "project_title": "School Rain Garden Network",
                    "project_category": "Water Conservation",
                    "project_cost": 4800000,
                    "duration_months": 12,
                },
            },
        )
        assert response.status_code == 201, response.text
        application_id = response.json()["id"]

        uploads = [
            _upload(client, application_id, "application_form.json", '{"project_cost": 4800000}'),
            _upload(
                client,
                application_id,
                "proposal_cost_48_lakh.pdf",
                "Project Title: School Rain Garden Network\nApplicant: Eastbank Green Forum\nOrganization Type: Registered NGO\nProject Category: Water Conservation\nProject Cost: INR 48 lakh\nDuration: 12 months",
            ),
            _upload(client, application_id, "budget_cost_55_lakh.csv", "item,total_cost\nWorks,INR 55 lakh\nProject Cost: INR 55 lakh"),
            _upload(client, application_id, "certificate.pdf", "Certificate Number: CERT-GISS-2026-041"),
        ]
        assert all(item.status_code == 200 for item in uploads)

        process_response = client.post(f"/api/v1/applications/{application_id}/process")
        assert process_response.status_code == 200, process_response.text
        state = process_response.json()
        assert state["current_node"] == "HUMAN_REVIEW"
        assert state["review_status"] == "AWAITING_HUMAN_REVIEW"

        validation = client.get(f"/api/v1/applications/{application_id}/validation").json()
        contradictions = [item for item in validation if item["validation_type"] == "CROSS_DOCUMENT_CONSISTENCY"]
        assert contradictions[0]["status"] == "FAIL"
        assert "CONTRADICTION DETECTED" in contradictions[0]["message"]

        score = client.get(f"/api/v1/applications/{application_id}/score").json()
        assert score["status"] == "GENERATED_DEVELOPMENT_MODEL"

        evidence = client.get(f"/api/v1/applications/{application_id}/evidence").json()
        assert any(item["finding_type"] == "BUDGET_INCONSISTENCY" for item in evidence)

        review = client.post(
            f"/api/v1/applications/{application_id}/review",
            json={"reviewer_id": "demo-reviewer", "decision": "REQUEST_CLARIFICATION", "comments": "Resolve cost mismatch."},
        )
        assert review.status_code == 200, review.text
        assert review.json()["status"] == "CLARIFICATION_REQUESTED"

        feedback = client.post(
            f"/api/v1/applications/{application_id}/feedback",
            json={
                "reviewer_id": "demo-reviewer",
                "feedback_type": "MISSING_EVIDENCE",
                "comment": "Need sheet-level source in production parser.",
            },
        )
        assert feedback.status_code == 201, feedback.text
        analytics = client.get("/api/v1/analytics/overview").json()
        assert "reviewer_performance" in analytics
        assert analytics["reviewer_performance"]["demo-reviewer"]["decisions"] == 1


def test_unsupported_file_is_rejected():
    with TestClient(app) as client:
        created = client.post("/api/v1/applications", json={"applicant_name": "Test", "project_title": "Test"}).json()
        response = client.post(
            f"/api/v1/applications/{created['id']}/documents",
            files={"file": ("malware.exe", BytesIO(b"nope"), "application/octet-stream")},
        )
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "UNSUPPORTED_FILE"


def test_missing_documents_produce_required_document_failure():
    with TestClient(app) as client:
        created = client.post(
            "/api/v1/applications",
            json={
                "applicant_name": "North Valley Community Trust",
                "project_title": "Wetland Learning Trail",
                "form_data": {
                    "applicant_name": "North Valley Community Trust",
                    "organization_type": "Registered NGO",
                    "project_title": "Wetland Learning Trail",
                    "project_cost": 1000000,
                    "duration_months": 10,
                },
            },
        ).json()
        _upload(client, created["id"], "proposal.pdf", "Project Cost: INR 10 lakh\nDuration: 10 months")
        response = client.post(f"/api/v1/applications/{created['id']}/process")
        assert response.status_code == 200
        validation = client.get(f"/api/v1/applications/{created['id']}/validation").json()
        required_doc = next(item for item in validation if item["validation_type"] == "REQUIRED_DOCUMENT")
        assert required_doc["status"] == "FAIL"


def test_model_unavailable_is_explicitly_persisted(db_session):
    class UnavailableScoringService(ScoringService):
        def score(self, features: dict[str, float]) -> dict[str, object]:
            raise ModelUnavailableError()

    scheme = db_session.query(Scheme).first()
    application = Application(scheme_id=scheme.id, applicant_name="Model Test", project_title="Unavailable Model")
    db_session.add(application)
    db_session.flush()
    prediction = PredictionPersistenceService(UnavailableScoringService()).score_and_save(
        db_session,
        application,
        {"document_completeness": 1.0},
    )
    db_session.commit()
    assert prediction.prediction_class == "UNAVAILABLE"
    assert prediction.status == "ML scoring unavailable."


def test_chroma_or_local_knowledge_retrieval_returns_scheme_guidance():
    with TestClient(app) as client:
        result = client.get("/api/v1/knowledge/search", params={"q": "maximum project cost", "limit": 1})
        assert result.status_code == 200
        assert result.json()
        assert "project cost" in result.json()[0]["text"].lower()
