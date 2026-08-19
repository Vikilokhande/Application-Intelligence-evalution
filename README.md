# Application Intelligence Platform

Enterprise AI application processing and evaluation platform for the Directorate of Environment & Climate Change.

This repository is a functional local-first vertical slice. It demonstrates intake of an application package, document intelligence, normalized profile creation, validation, deterministic rule evaluation, feature engineering, development ML scoring, evidence generation, reviewer routing, human review, audit logging, feedback capture, and analytics.

AI and rules are decision support only. Final approve/reject/clarification decisions are always made by an authorized human reviewer.

## Architecture Flow

Heterogeneous Application -> Application Intake -> Document Intelligence -> Extraction + Normalization -> Validation & Verification -> Knowledge-Based Rule Engine -> Validated Application -> Feature Engineering -> Explainable ML / AI Engine -> Decision Support & Explainability -> Intelligent Workflow Routing -> Human Review & Final Decision -> Integration & Recording -> Analytics & Reporting -> Feedback & Improvement.

The runtime workflow pauses at `HUMAN_REVIEW`. There is no automatic approval or rejection node.

## Repository Structure

- `backend/` FastAPI, SQLAlchemy, Alembic, LangGraph state/workflow, Chroma knowledge adapter, service modules, tests
- `frontend/` React, TypeScript, Vite, Tailwind dashboard and reviewer workspace
- `data/knowledge/` local scheme knowledge for Chroma-backed retrieval
- `data/samples/` fictional sample documents for local verification
- `data/synthetic/` synthetic application scenarios
- `ml/` future training, evaluation, and model artifact area
- `docs/architecture/` architecture notes
- `docs/adr/` architecture decisions
- `scripts/` local run and verification scripts
- `docker/` backend/frontend container definitions

## Backend

Stack:

- Python
- FastAPI
- SQLAlchemy ORM
- Alembic migrations
- Pydantic schemas/settings
- LangGraph workflow skeleton with typed `ApplicationProcessingState`
- LangChain-compatible provider abstractions
- Local ChromaDB knowledge retrieval with deterministic local embedding fallback
- MySQL for Docker system-of-record deployment
- SQLite default for fast local development and tests

Important backend modules:

- `backend/app/ingestion/file_store.py` validates file types, size limits, checksums, and local paths
- `backend/app/extraction/` contains `DocumentParser`, `OCRProvider`, `LLMProvider`, and `EmbeddingProvider` abstractions
- `backend/app/normalization/service.py` keeps raw extracted values separate from validated values
- `backend/app/validation/service.py` runs validation before feature engineering/scoring
- `backend/app/rules/engine.py` evaluates configurable scheme rules without LLMs
- `backend/app/features/service.py` builds trusted tabular features after validation
- `backend/app/ml/scoring.py` defines `ScoringService`, `XGBoostScoringService`, and labelled `MockScoringService`
- `backend/app/explainability/service.py` persists evidence-first model/rule traces
- `backend/app/workflow/` defines the required LangGraph node order
- `backend/app/review/service.py` records human decisions and overrides
- `backend/app/analytics/service.py` computes database-derived metrics

## API Endpoints

All platform APIs are versioned under `/api/v1`.

- `POST /applications`
- `POST /applications/{id}/documents`
- `POST /applications/{id}/process`
- `GET /applications/{id}`
- `GET /applications/{id}/status`
- `GET /applications/{id}/validation`
- `GET /applications/{id}/score`
- `GET /applications/{id}/evidence`
- `GET /applications/{id}/workflow`
- `POST /applications/{id}/review`
- `POST /applications/{id}/clarification`
- `POST /applications/{id}/review/open`
- `POST /applications/{id}/feedback`
- `GET /applications/{id}/feedback`
- `GET /applications`
- `GET /analytics/overview`
- `GET /schemes`
- `GET /schemes/{id}`
- `POST /schemes`
- `POST /schemes/{id}/rules`
- `GET /knowledge/search`
- `GET /health`

FastAPI OpenAPI docs are available at `http://127.0.0.1:8000/docs`.

## Database Tables

The SQLAlchemy/Alembic schema includes:

- `users`
- `roles`
- `applications`
- `documents`
- `extracted_data`
- `application_profiles`
- `schemes`
- `scheme_rules`
- `validation_results`
- `rule_results`
- `features`
- `model_predictions`
- `evidence`
- `reviewer_assignments`
- `reviewer_decisions`
- `audit_logs`
- `feedback`
- `notifications`

Document binaries are stored on the local filesystem. MySQL stores metadata, paths, checksums, status, audit records, evidence, and transactional data.

## Frontend

Stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- lucide-react icons

Pages:

- Dashboard
- New Application
- Application Processing
- Application Details
- Validation & Verification
- AI Scoring & Explainability
- Reviewer Workspace
- Audit Trail
- Scheme Knowledge/Rules
- Analytics

The Application Details page follows the requested sequence: summary, documents, extracted information, validation results, rule results, ML scores, evidence, AI recommendation, and a prominent human decision area.

## Local Development

Install backend dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

Install frontend dependencies:

```powershell
cd frontend
cmd /c npm.cmd install
cd ..
```

Run the backend locally with SQLite:

```powershell
$env:DATABASE_URL='sqlite:///./application_intelligence.db'
$env:PYTHONPATH='backend'
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the frontend:

```powershell
cd frontend
cmd /c npm.cmd run dev
```

Open:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- OpenAPI: `http://127.0.0.1:8000/docs`

## Docker Compose

Copy `.env.example` to `.env` if you want to customize values.

```powershell
docker compose up --build
```

Services:

- Backend API: `http://127.0.0.1:8000`
- Frontend UI: `http://127.0.0.1:5173`
- MySQL: `127.0.0.1:3306`
- ChromaDB persistence: `data/chroma/`

## Migrations

Run Alembic locally:

```powershell
cd backend
$env:DATABASE_URL='sqlite:///./migration_check.db'
python -m alembic upgrade head
python -m alembic current
cd ..
```

For Docker/MySQL, use the `DATABASE_URL` from `.env.example`.

## Verification

Backend tests:

```powershell
python -m pytest backend\tests -q
```

Frontend build:

```powershell
cd frontend
cmd /c npm.cmd run build
cmd /c npm.cmd run typecheck
cd ..
```

Sample vertical slice:

```powershell
python scripts\verify_vertical_slice.py
```

Expected sample output includes:

- `workflow_current_node=HUMAN_REVIEW`
- `review_status=AWAITING_HUMAN_REVIEW`
- `contradiction_status=FAIL`
- `CONTRADICTION DETECTED`
- a reviewer-routing AI recommendation such as `EXPERT_REVIEW`

## Current Limitations

- Document parsing is a deterministic local mock parser for the POC. Real PDF/DOCX/XLSX parsing and OCR adapters should replace it.
- `MockScoringService` is labelled as a development model. It is not a calibrated fraud, quality, or eligibility model.
- `XGBoostScoringService` is scaffolded but no trained model artifact is included.
- ChromaDB is local and optional at runtime; the adapter falls back to local text retrieval if Chroma is unavailable.
- Authentication/RBAC is abstracted with a demo user context. Production identity integration must replace it.
- MySQL is configured for Docker, while local tests default to SQLite for speed.
- External government integrations are local mock adapters only.

## Next Implementation Steps

1. Add production-grade document parsers for PDF, DOCX, XLSX, CSV, and image OCR.
2. Expand extraction schemas and confidence calibration.
3. Implement reviewer authentication and role/permission enforcement.
4. Add trained XGBoost artifacts, SHAP explanations, and model evaluation reports.
5. Replace deterministic sample embeddings with an approved local embedding model.
6. Add notification workflows and clarification response intake.
7. Expand analytics with SLA tracking and reviewer queue management.

