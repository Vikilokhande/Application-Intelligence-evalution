# DECC Environmental Review Portal & Decision Support Platform

**Directorate of Environment & Climate Change (DECC) — Government of Maharashtra**  
**Core Operating Principle**: *"AI Assists · Human Decides"*  

---

## 📌 Executive Overview

The **DECC Application Intelligence & Environmental Review Portal** is an AI-assisted evaluation and decision support platform built to modernize the statutory environmental clearance process for the Government of Maharashtra.

The platform streamlines application intake, document ingestion, smart optical character recognition (OCR), cross-document validation, policy knowledge retrieval (RAG), and machine learning risk scoring—while strictly retaining final clearance authority in the hands of authorized government reviewers.

---

## ✨ Key Capabilities

1. **Intelligent Document Ingestion & Multi-Format OCR**: Parses text layers, tables, and scanned pages from PDFs, Word documents, Excel spreadsheets, and images using `pdfplumber` and `Tesseract OCR`.
2. **3-Layer Deterministic Validation Engine**: Executes 33 automated compliance checks including required fields, budget caps, entity eligibility, and cross-document discrepancy spotters (flagging cost discrepancies $> ₹5,000$ or $> 2\%$).
3. **Single-Source Protection Safeguard**: Gracefully marks single-source data as `NOT_VERIFIABLE` without penalizing honest applicants with false contradiction penalties.
4. **Policy Grounding via ChromaDB RAG**: Retrieves exact statutory excerpts and confidence scores from official policy guideline documents using dense vector embeddings (`all-MiniLM-L6-v2`).
5. **3-Model XGBoost Machine Learning Ensemble**: Evaluates 13 canonical features to predict Risk Class (`LOW`, `MEDIUM`, `HIGH`), continuous Risk Index (`0–100`), Quality Score, and global feature gain importances.
6. **LLM Post-Scoring Advisory Reasoner**: Synthesizes human-readable case summaries, highlights missing requirements, and drafts targeted clarification questions without altering deterministic calculations.
7. **1-Click Official Decision Cockpit**: Enables senior reviewers to inspect evidence, record final decisions (`APPROVE`, `REQUEST_CLARIFICATION`, `REJECT`), and log mandatory override rationales.
8. **Automated HTML Email Clearance Reports**: Dispatches gap-free, responsive government-branded HTML status cards directly to the applicant via SMTP.
9. **Full Audit Trail & Analytics**: Real-time KPI dashboard tracking application throughput, risk distributions, approval ratios, and an append-only audit trail.
10. **Bilingual Support**: Built-in runtime switching between English and Hindi (`hi`) across all screens.

---

## 🏛 System Architecture & Workflow Pipeline

```
Application Submission
        ↓
Document Ingestion & Checksumming (SHA-256)
        ↓
OCR & Text Extraction (pdfplumber / Tesseract)
        ↓
Application Profile Normalization
        ↓
3-Tier Deterministic & Cross-Document Validation
        ↓
ChromaDB Policy RAG Evidence Retrieval
        ↓
Feature Engineering (13 Canonical Features)
        ↓
3-Model XGBoost ML Scoring (Risk + Quality)
        ↓
LLM Post-Scoring Advisory Synthesis
        ↓
Reviewer Workspace (Officer Cockpit)
        ↓
Human Statutory Decision (Approve / Clarify / Reject)
        ↓
Automated HTML Email Clearance Dispatch
        ↓
Real-Time Analytics & Append-Only Audit Logging
```

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS / Tailwind, Zustand, i18next (EN/HI), Lucide Icons |
| **Backend API** | Python 3.10+, FastAPI, Pydantic v2, Uvicorn |
| **Database** | SQLite (Development) / PostgreSQL / MySQL (Production), SQLAlchemy 2.0 ORM, Alembic |
| **Document Intelligence** | `pdfplumber`, `pypdf`, `pytesseract` (Tesseract OCR), `python-docx`, `openpyxl` |
| **Vector Store & RAG** | ChromaDB, Sentence-Transformers (`all-MiniLM-L6-v2`) |
| **Machine Learning** | XGBoost (UBJ model format), Scikit-Learn, NumPy, Pandas |
| **LLM Inference** | OpenRouter API Gateway (`z-ai/glm-5.2:free`, `minimax/minimax-m3:free`, `openrouter/auto`) |
| **Email Service** | Python `smtplib`, `email.mime` (Responsive HTML Templates) |

---

## 📁 Repository Structure

```
├── backend/                               # FastAPI application backend
│   ├── alembic/                           # Database migration scripts
│   ├── app/
│   │   ├── api/v1/                        # REST API routing endpoints
│   │   ├── core/                          # Settings, security, exceptions, database
│   │   ├── extraction/                    # OCR and multi-format document parsers
│   │   ├── features/                      # 13-feature engineering service
│   │   ├── ingestion/                     # File storage and SHA-256 validator
│   │   ├── knowledge/                     # ChromaDB vector knowledge base service
│   │   ├── llm_reasoning/                 # OpenRouter LLM advisory service
│   │   ├── ml/                            # XGBoost scoring service & model artifacts
│   │   ├── models/                        # 18 SQLAlchemy ORM entity models
│   │   ├── normalization/                 # Application profile synthesizer
│   │   ├── review/                        # Decision recording & human governance
│   │   ├── services/                      # Email and notification services
│   │   └── validation/                    # 3-tier deterministic validation engine
│   └── tests/                             # Pytest automated test suite
├── frontend/                              # React + TypeScript + Vite frontend
│   ├── public/                            # Static assets and translations (en/hi)
│   └── src/
│       ├── components/                    # Reusable UI cards, tables, badges, headers
│       ├── context/                       # Authentication and theme contexts
│       ├── i18n/                          # Internationalization configuration
│       ├── pages/                         # Application pages & reviewer workflows
│       ├── services/                      # API client integration
│       └── types/                         # TypeScript interface contracts
├── data/
│   ├── chroma/                            # Persistent ChromaDB vector collections
│   ├── knowledge/                         # Statutory scheme policy markdown files
│   └── uploads/                           # Encrypted document uploads
├── docs/                                  # Project Documentation
│   ├── REQUIREMENTS.md                    # System Requirements Specification (SRS)
│   ├── TECHNICAL_DOCUMENTATION.md         # Technical Architecture & Pipeline Document
│   └── SETUP.md                           # Developer Setup & Installation Guide
├── scripts/                               # Helper scripts (TTS, PPTX, PDF generators)
├── .env.example                           # Clean environment variables template
├── .gitignore                             # Git ignore rules for security & artifacts
├── docker-compose.yml                     # Multi-container deployment configuration
└── README.md                              # This documentation
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp ../.env.example .env      # Configure API keys if needed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend Swagger Docs: `http://localhost:8000/docs`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend Portal: `http://localhost:5173`*

---

## 🧪 Testing & Verification

- **Run Backend Tests**:
  ```bash
  cd backend && python -m pytest
  ```
- **Build Frontend for Production**:
  ```bash
  cd frontend && npm run build
  ```

---

## 📚 Complete Documentation Links

- 📖 **[System Requirements Specification](docs/REQUIREMENTS.md)**: Detailed user roles, functional specifications, and NFRs.
- 🏗 **[Technical Architecture & Pipeline](docs/TECHNICAL_DOCUMENTATION.md)**: Deep dive into ML features, RAG architecture, database models, and error recovery.
- 💻 **[Installation & Setup Guide](docs/SETUP.md)**: Step-by-step setup for development, database migrations, and testing.

---

## 🔒 Security & Privacy

- **Zero Plaintext Secrets**: No API keys, passwords, or SMTP secrets are committed to version control.
- **Role-Based Access**: Granular RBAC ensuring only authorized Senior Reviewers can submit statutory decisions.
- **Audit Immutability**: All decisions and pipeline transitions are logged with timestamps and reviewer IDs.
