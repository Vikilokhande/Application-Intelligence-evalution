"""
check_health.py
===============

Quick health check for the Application Intelligence Platform.

Checks:
  [1] Database connection
  [2] LLM provider (Groq API call)
  [3] OCR provider (Tesseract binary)
  [4] ML model file
  [5] Knowledge base directory

Run from backend/ directory:
    python check_health.py

Exit codes:
  0 = all critical checks passed
  1 = critical failure
"""

import json
import os
import sys
from pathlib import Path

# ── Load .env ──────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

PASS = "\033[92m[OK]   \033[0m"
FAIL = "\033[91m[FAIL] \033[0m"
WARN = "\033[93m[WARN] \033[0m"
INFO = "       "

errors: list[str] = []
warnings: list[str] = []


def section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


# ── 1. Database ────────────────────────────────────────────────────────────────
section("1. DATABASE")
db_url = os.environ.get("DATABASE_URL", "sqlite:///./application_intelligence.db")
print(f"{INFO} URL: {db_url}")
try:
    from sqlalchemy import create_engine, text
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
    with engine.connect() as conn:
        row = conn.execute(text("SELECT 1")).fetchone()
        assert row and row[0] == 1
    print(f"{PASS} Database connection OK")
except Exception as exc:
    print(f"{FAIL} Database FAILED: {exc}")
    errors.append("database")
    sys.exit(1)


# ── 2. LLM Provider ───────────────────────────────────────────────────────────
section("2. LLM PROVIDER (Groq)")
api_key = (
    os.environ.get("LLM_API_KEY", "")
    or os.environ.get("GROQ_API_KEY", "")
    or os.environ.get("QROQ_API_KEY", "")
)
llm_model = os.environ.get("LLM_MODEL", "llama3-8b-8192")
llm_base_url = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
print(f"{INFO} Provider : {os.environ.get('LLM_PROVIDER', 'groq')}")
print(f"{INFO} Model    : {llm_model}")
print(f"{INFO} Base URL : {llm_base_url}")
print(f"{INFO} API Key  : {'SET (hidden)' if api_key else 'NOT SET'}")

if not api_key:
    print(f"{WARN} LLM API key not set. Set GROQ_API_KEY or QROQ_API_KEY in .env")
    warnings.append("llm_api_key_missing")
else:
    try:
        import urllib.request
        payload = json.dumps({
            "model": llm_model,
            "messages": [{"role": "user", "content": "Say 'LLM OK' in exactly those two words."}],
            "max_tokens": 10,
            "temperature": 0,
        }).encode()
        req = urllib.request.Request(
            f"{llm_base_url}/chat/completions",
            data=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read())
        reply = body["choices"][0]["message"]["content"].strip()
        print(f"{INFO} Response : {reply}")
        print(f"{PASS} LLM call OK — model={body.get('model', 'unknown')}")
    except Exception as exc:
        print(f"{FAIL} LLM call FAILED: {exc}")
        errors.append("llm")


# ── 3. OCR Provider ───────────────────────────────────────────────────────────
section("3. OCR PROVIDER (Tesseract)")
ocr_enabled = os.environ.get("OCR_ENABLED", "true").lower() == "true"
ocr_provider = os.environ.get("OCR_PROVIDER", "tesseract")
tesseract_cmd = os.environ.get("TESSERACT_CMD", "")
print(f"{INFO} Enabled  : {ocr_enabled}")
print(f"{INFO} Provider : {ocr_provider}")
if tesseract_cmd:
    print(f"{INFO} CMD path : {tesseract_cmd}")

if not ocr_enabled or ocr_provider == "none":
    print(f"{WARN} OCR disabled (OCR_ENABLED=false or OCR_PROVIDER=none).")
    warnings.append("ocr_disabled")
else:
    try:
        import pytesseract  # type: ignore
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        version = pytesseract.get_tesseract_version()
        print(f"{INFO} Version  : {version}")
        print(f"{PASS} Tesseract OCR OK")
    except ImportError:
        print(f"{FAIL} pytesseract not installed. Run: pip install pytesseract")
        errors.append("pytesseract_missing")
    except Exception as exc:
        print(f"{FAIL} Tesseract binary not found: {exc}")
        print(f"{INFO} On Windows: install Tesseract and set TESSERACT_CMD=<path>")
        errors.append("tesseract_binary_missing")


# ── 4. ML Model ───────────────────────────────────────────────────────────────
section("4. ML MODEL")
ml_provider = os.environ.get("ML_PROVIDER", "unavailable")
ml_model_path = Path(os.environ.get("ML_MODEL_PATH", "../ml/models/model.ubj"))
print(f"{INFO} Provider : {ml_provider}")
print(f"{INFO} Path     : {ml_model_path}")

if ml_provider == "unavailable":
    print(f"{WARN} ML scoring explicitly disabled (ML_PROVIDER=unavailable).")
    print(f"{INFO} Train a model with: python ml/training/train.py --data <data.csv>")
    warnings.append("ml_unavailable")
elif ml_provider == "baseline":
    print(f"{WARN} ML_PROVIDER=baseline — deterministic formula only (not real ML).")
    warnings.append("ml_baseline")
else:
    if ml_model_path.exists():
        size_kb = ml_model_path.stat().st_size // 1024
        print(f"{INFO} Size     : {size_kb} KB")
        print(f"{PASS} XGBoost model file found")
    else:
        print(f"{FAIL} Model file not found at {ml_model_path}")
        print(f"{INFO} Train with: python ml/training/train.py --data <data.csv>")
        errors.append("ml_model_missing")


# ── 5. Knowledge Base ─────────────────────────────────────────────────────────
section("5. KNOWLEDGE BASE")
kb_path = Path(os.environ.get("KNOWLEDGE_PATH", "../data/knowledge"))
print(f"{INFO} Path : {kb_path}")
if kb_path.exists():
    md_files = list(kb_path.glob("*.md"))
    print(f"{INFO} Files: {len(md_files)} .md files")
    if md_files:
        print(f"{PASS} Knowledge base directory OK — {', '.join(f.name for f in md_files[:3])}")
    else:
        print(f"{WARN} Knowledge directory exists but is empty.")
        warnings.append("knowledge_empty")
else:
    print(f"{FAIL} Knowledge directory not found: {kb_path}")
    errors.append("knowledge_missing")


# ── Summary ───────────────────────────────────────────────────────────────────
section("SUMMARY")
if not errors:
    print(f"{PASS} All critical checks passed.")
    if warnings:
        print(f"{WARN} Warnings: {', '.join(warnings)}")
    print()
    sys.exit(0)
else:
    print(f"{FAIL} Critical failures: {', '.join(errors)}")
    if warnings:
        print(f"{WARN} Warnings: {', '.join(warnings)}")
    print()
    sys.exit(1)
