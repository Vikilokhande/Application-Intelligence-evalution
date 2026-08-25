# System Requirements Specification (SRS)

**System Name**: Directorate of Environment and Climate Change (DECC) Application Intelligence & Environmental Review Portal  
**Document Version**: 2.0.0  
**Status**: Implemented & Production-Ready  
**Core Principle**: *"AI Assists · Human Decides"*  

---

## 1. Project Overview & Main Objective

The **DECC Application Intelligence & Environmental Review Portal** is an enterprise-grade decision support platform built for the Directorate of Environment and Climate Change, Government of Maharashtra. 

Its primary objective is to transform the traditional, manual, paper-intensive environmental clearance evaluation workflow into an automated, highly transparent, and legally defensible digital process. The platform automates document intake, optical character recognition (OCR), cross-document data reconciliation, statutory policy verification (RAG), and machine learning risk scoring—while strictly preserving final decision authority in the hands of authorized government officers.

---

## 2. User Roles & Permissions

The platform supports Role-Based Access Control (RBAC) across four primary administrative and operational roles:

| Role Name | Identifier | Access & Authority Scope |
| :--- | :--- | :--- |
| **Administrator** | `admin` | Full system configuration, scheme creation, rule threshold editing, user role management, and system-wide analytics. |
| **Senior Reviewer** | `senior_reviewer` | Authority to review high-risk and complex applications, override AI recommendations with written justification, submit final clearance/rejection decisions, and trigger official email dispatch. |
| **Case Reviewer** | `reviewer` | Reviews low-to-medium risk applications, reviews verification checklists, requests clarifications from applicants, and submits initial recommendations. |
| **Compliance Viewer** | `viewer` | Read-only access to application summaries, verification evidence, and the append-only audit trail for statutory auditing. |

---

## 3. Core Functional Requirements

### 3.1 Application Workflow & Intake
- **REQ-INT-01**: The system must provide a guided 3-step application creation wizard capturing applicant identity, organization type, project title, category, district, estimated budget, duration, and environmental mitigation scope.
- **REQ-INT-02**: The system must support multi-file uploads across accepted formats: `pdf`, `docx`, `xlsx`, `csv`, `jpg`, `png`, `tiff`, and `txt` up to 25 MB per file.
- **REQ-INT-03**: The system must compute SHA-256 checksums upon upload to ensure document immutability and detect duplicate submissions.

### 3.2 Document Processing & OCR
- **REQ-OCR-01**: The system must natively parse text layers and tabular data from digital PDFs using `pdfplumber` and `pypdf`.
- **REQ-OCR-02**: If character density is below 100 characters or char-to-byte ratio is $< 0.10$, the system must automatically invoke the `Tesseract OCR` engine on rasterized pages (300 DPI).
- **REQ-OCR-03**: The system must classify document types (Proposal, Budget Sheet, EIA Report, Certificate) and calculate field-level extraction confidence scores.

### 3.3 Normalization & Profile Synthesis
- **REQ-NORM-01**: The system must merge multi-document extractions into a single canonical `ApplicationProfile` JSON structure.
- **REQ-NORM-02**: Conflicting scalar fields (e.g. Applicant Name, Project Cost) must select the highest-confidence extraction as primary while preserving all secondary extractions in traceable sources arrays.

### 3.4 3-Layer Validation Architecture
- **REQ-VAL-01 (Deterministic)**: Must evaluate 12+ deterministic checks (mandatory fields, numerical range validation, certificate registration formatting).
- **REQ-VAL-02 (Cross-Document)**: Must compare project cost, duration, applicant name, and project title between distinct documents. Discrepancies exceeding ₹5,000 or 2% must be flagged as contradictions (`FAIL`).
- **REQ-VAL-03 (Single-Source Protection)**: When only one document is available for cross-comparison, the system must assign status `NOT_VERIFIABLE` and must NOT penalize the application with false contradictions.
- **REQ-VAL-04 (Scheme Rules)**: Must evaluate statutory policy rules (e.g., max funding ceiling ₹50,00,000, max duration 24 months, eligible organization types).

### 3.5 RAG Evidence Retrieval
- **REQ-RAG-01**: The system must maintain a ChromaDB vector store indexing official scheme policy markdown documents (`data/knowledge/*.md`) chunked at 500 words with 50-word overlap.
- **REQ-RAG-02**: Must use dense embeddings (`sentence-transformers/all-MiniLM-L6-v2`) to retrieve top-3 relevant policy clauses (threshold score $\ge 0.35$) and attach them as verifiable `Evidence` entities.

### 3.6 ML Risk & Quality Scoring
- **REQ-ML-01**: The feature engineering service must compute 13 canonical features normalized between 0.0 and 1.0.
- **REQ-ML-02**: The system must execute a 3-model XGBoost ensemble (`risk_classifier.ubj`, `risk_regressor.ubj`, `quality_regressor.ubj`) to predict:
  - Risk Classification: `LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK` + Confidence.
  - Continuous Risk Score: `[0.0, 100.0]` (higher indicates greater risk).
  - Continuous Quality Score: `[0.0, 100.0]` (higher indicates higher application quality).
- **REQ-ML-03**: Global feature gain importances must be calculated and linked to the prediction for reviewer explainability.

### 3.7 LLM Post-Scoring Reasoning
- **REQ-LLM-01**: An LLM (via OpenRouter API) must be called **only once** after deterministic validation and ML scoring to synthesize natural-language summaries, highlight failed checks, and generate targeted clarification questions.
- **REQ-LLM-02**: The LLM must NOT modify XGBoost predictions, risk scores, or deterministic validation outcomes.
- **REQ-LLM-03**: If the LLM provider times out or returns HTTP 429, the system must execute exponential backoff (2 retries), switch to the fallback model, or enter degraded mode (`AI_REASONING=UNAVAILABLE`) without interrupting the pipeline.

### 3.8 Human Reviewer Workspace & Governance
- **REQ-REV-01**: The pipeline must automatically pause at the `HUMAN_REVIEW` checkpoint (`AWAITING_HUMAN_REVIEW`).
- **REQ-REV-02**: Reviewers must be presented with an integrated cockpit showing Case Overview, Flagged Contradictions, Scheme Evidence Excerpts, and the AI Advisory.
- **REQ-REV-03**: Reviewers must submit an official statutory decision (`APPROVE`, `REQUEST_CLARIFICATION`, `REJECT`). If overriding the AI advisory, a mandatory written override reason must be recorded.

### 3.9 Automated Email Dispatch
- **REQ-EMAIL-01**: Reviewers must be able to trigger an official clearance email report to the applicant via SMTP.
- **REQ-EMAIL-02**: The email must render a gap-free, responsive HTML template featuring government branding, a KPI summary table, and formatted issue cards with actionable next steps.

### 3.10 Clearance Analytics & Audit Trail
- **REQ-AUD-01**: Every state transition, upload, OCR execution, validation check, ML prediction, reviewer decision, and email dispatch must be recorded in an append-only `AuditLog` table.
- **REQ-ANA-01**: Real-time analytics dashboard must display total submissions, pending queues, risk distributions, approval ratios, and average turnaround times.

---

## 4. Non-Functional Requirements (NFR)

- **NFR-01 (Performance)**: End-to-end processing of a 4-document application package must complete within 15–45 seconds.
- **NFR-02 (Availability & Fault Tolerance)**: All deterministic validation checks and XGBoost ML scoring must operate independently of external cloud LLM availability.
- **NFR-03 (Security & Compliance)**: Zero plaintext logging of API keys, passwords, or PII. Parameterized SQL queries via SQLAlchemy ORM.
- **NFR-04 (Accessibility & Localization)**: Full runtime bilingual support for English and Hindi (`hi`) across all reviewer pages.
