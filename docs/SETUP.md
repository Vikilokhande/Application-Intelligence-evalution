# System Installation & Developer Setup Guide

**Project**: DECC Application Intelligence & Environmental Review Portal  
**Platform**: Directorate of Environment & Climate Change — Government of Maharashtra  
**Version**: 2.0.0  

---

## 1. System Prerequisites

Ensure the following runtimes and tools are installed on your host machine:

| Component | Minimum Version | Recommended Version | Verification Command |
| :--- | :---: | :---: | :--- |
| **Python** | 3.10+ | 3.11 / 3.12 | `python --version` |
| **Node.js** | 18.0.0+ | 20.x LTS | `node --version` |
| **npm** | 9.0.0+ | 10.x | `npm --version` |
| **Git** | 2.30+ | Latest | `git --version` |
| **Tesseract OCR** *(Optional for Scanned PDFs)* | 5.0+ | 5.3+ | `tesseract --version` |

---

## 2. Step-by-Step Installation

### Step A: Clone the Repository
```bash
git clone https://github.com/Vikilokhande/Application-Intelligence-evalution.git
cd Application-Intelligence-evalution
```

---

### Step B: Backend Environment & Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Copy the example configuration file:
   ```bash
   cp ../.env.example .env
   ```
   *(On Windows Command Prompt: `copy ..\.env.example .env`)*

   Key parameters to configure in `.env`:
   - `OPENROUTER_API_KEY`: *(Optional)* OpenRouter API key for cloud LLM reasoning.
   - `SMTP_USER` & `SMTP_PASSWORD`: *(Optional)* Gmail App Password for clearance emails.
   - `DEMO_MODE`: Set to `true` for offline local development without external API keys.

5. **Start the FastAPI Backend**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The interactive Swagger API documentation will be available at:* `http://localhost:8000/docs`

---

### Step C: Frontend Setup & Execution

1. **Open a new terminal and navigate to frontend**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Configure Frontend Environment**:
   Ensure `frontend/.env` contains the backend API URL (optional if using default proxy):
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   *The React web portal will be accessible at:* `http://localhost:5173`

---

## 3. Database & Knowledge Base Initialization

### 3.1 SQLite Database Migration & Seeding
The database tables and demo schemes automatically initialize on backend startup. To inspect or reset migrations manually:
```bash
cd backend
alembic upgrade head
```

### 3.2 ChromaDB Policy Knowledge Base
Statutory policy guidelines are stored in `data/knowledge/`:
- `green_infrastructure_guidelines.md`
- `urban_afforestation_scheme.md`
- `coastal_zone_regulations.md`

On initial startup, the ChromaDB vector store (`data/chroma/`) automatically reads, chunks, embeds, and indexes these documents using `sentence-transformers/all-MiniLM-L6-v2`.

---

## 4. Verification & Testing

### 4.1 Backend Test Suite
Run the automated test suite to verify unit tests, API contracts, deterministic validation, and ML models:
```bash
cd backend
python -m pytest
```

### 4.2 Frontend Compilation & Build
Verify TypeScript type checks and production bundle compilation:
```bash
cd frontend
npm run build
```

---

## 5. One-Click Startup Scripts (Windows)

For local development on Windows, convenient batch scripts are provided in the root directory:
- `start_all.bat`: Concurrently launches both Backend (port 8000) and Frontend (port 5173).
- `start_backend.bat`: Launches the FastAPI Uvicorn server.
- `start_frontend.bat`: Launches the Vite frontend dev server.
