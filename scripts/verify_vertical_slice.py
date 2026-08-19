import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("DATABASE_URL", "sqlite:///./application_intelligence.db")
os.environ.setdefault("UPLOAD_DIR", str(ROOT / "data" / "uploads"))
os.environ.setdefault("CHROMA_PATH", str(ROOT / "data" / "chroma"))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


SAMPLES = ROOT / "data" / "samples"


def upload(client: TestClient, application_id: str, filename: str) -> None:
    path = SAMPLES / filename
    with path.open("rb") as handle:
        response = client.post(
            f"/api/v1/applications/{application_id}/documents",
            files={"file": (filename, handle, "application/octet-stream")},
        )
    response.raise_for_status()


def main() -> None:
    with TestClient(app) as client:
        created = client.post(
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
        created.raise_for_status()
        application_id = created.json()["id"]

        for filename in ["application_form.json", "proposal_cost_48_lakh.pdf", "budget_cost_55_lakh.csv", "certificate.pdf"]:
            upload(client, application_id, filename)

        process = client.post(f"/api/v1/applications/{application_id}/process")
        process.raise_for_status()
        state = process.json()

        validation = client.get(f"/api/v1/applications/{application_id}/validation")
        validation.raise_for_status()
        contradiction = next(
            item
            for item in validation.json()
            if item["validation_type"] == "CROSS_DOCUMENT_CONSISTENCY"
        )

        score = client.get(f"/api/v1/applications/{application_id}/score")
        score.raise_for_status()

        print(f"application_id={application_id}")
        print(f"workflow_current_node={state['current_node']}")
        print(f"review_status={state['review_status']}")
        print(f"contradiction_status={contradiction['status']}")
        print(f"contradiction_message={contradiction['message']}")
        print(f"prediction_class={score.json()['prediction_class']}")
        print(f"ai_recommendation={client.get(f'/api/v1/applications/{application_id}/status').json()['ai_recommendation']}")


if __name__ == "__main__":
    main()

