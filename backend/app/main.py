"""
app/main.py
===========

FastAPI application entry point.

Startup sequence:
1. Configure logging
2. Init DB (create tables)
3. Seed default data
4. Validate LLM configuration
5. Check OCR availability (non-fatal warning)
6. Index knowledge base

Health check at GET /health includes provider status.
Auth token endpoint at POST /api/v1/auth/token (demo mode + real JWT).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.routes import router
from app.core.config import get_settings
from app.core.exceptions import ApplicationError
from app.core.logging import configure_logging
from app.db.session import SessionLocal, init_db
from app.extraction.providers import detect_tesseract_cmd, get_llm_provider
from app.knowledge.service import knowledge_base
from app.services.seed import seed_default_data

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


def _check_ocr_health() -> dict[str, str]:
    """Non-fatal OCR startup check. Reports status without crashing."""
    if not settings.ocr_enabled or settings.ocr_provider == "none":
        return {"status": "disabled", "provider": "none"}
    try:
        import pytesseract  # type: ignore
        tesseract_cmd = detect_tesseract_cmd(settings.tesseract_cmd)
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        version = pytesseract.get_tesseract_version()
        logger.info("OCR provider OK: tesseract version=%s", version)
        return {"status": "ok", "provider": "tesseract", "version": str(version), "path": tesseract_cmd or "PATH"}
    except ImportError:
        logger.warning(
            "OCR: pytesseract is not installed. "
            "Documents requiring OCR will fail with OCR_PROVIDER_ERROR."
        )
        return {"status": "unavailable", "provider": "tesseract", "reason": "pytesseract not installed"}
    except Exception as exc:
        logger.warning(
            "OCR: Tesseract binary not found or not functional: %s. "
            "Documents requiring OCR will fail with OCR_PROVIDER_ERROR. "
            "On Windows, set TESSERACT_CMD to the path of tesseract.exe.",
            exc,
        )
        return {"status": "unavailable", "provider": "tesseract", "reason": str(exc)}


def _check_llm_health() -> dict[str, str]:
    """Non-fatal LLM startup check."""
    if not settings.has_llm_credentials():
        if settings.demo_mode:
            logger.warning(
                "LLM: No API key configured (GROQ_API_KEY / QROQ_API_KEY). "
                "LLM extraction and classification will fail. "
                "Set the API key in .env to enable real extraction."
            )
            return {"status": "unconfigured", "provider": settings.llm_provider}
        else:
            logger.error("LLM: API key is required when DEMO_MODE=false.")
            return {"status": "error", "provider": settings.llm_provider, "reason": "API key missing"}
    logger.info("LLM provider configured: %s model=%s", settings.llm_provider, settings.llm_model)
    return {"status": "configured", "provider": settings.llm_provider, "model": settings.llm_model}


def _check_ml_health() -> dict[str, str]:
    """Non-fatal ML startup check."""
    import os
    if settings.ml_provider == "unavailable":
        return {"status": "explicitly_disabled", "provider": "none"}
    if settings.ml_provider == "baseline":
        return {"status": "baseline_only", "provider": "baseline"}
    model_path = settings.ml_model_path
    if not os.path.exists(model_path):
        logger.warning(
            "ML: Model file not found at %s. "
            "Scoring will return MODEL_UNAVAILABLE until the model is trained. "
            "Train with: python ml/training/train.py --data <labelled_data.csv>",
            model_path,
        )
        return {"status": "model_not_found", "provider": settings.ml_provider, "path": model_path}
    logger.info("ML model file found: %s", model_path)
    return {"status": "model_ready", "provider": settings.ml_provider, "path": model_path}


def _check_embedding_health() -> dict[str, str]:
    return {
        "status": "configured",
        "provider": settings.embedding_provider,
        "model": settings.embedding_model,
    }


def _check_database_health() -> dict[str, str]:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "provider": "sqlalchemy"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "unavailable", "provider": "sqlalchemy", "reason": str(exc)}


def _check_llm_deep_health() -> dict[str, str]:
    if not settings.has_llm_credentials():
        return {"status": "unconfigured", "provider": settings.llm_provider}
    try:
        provider = get_llm_provider(settings)
        response = provider.generate("Return exactly OK.", system="Health check. No sensitive data.")
        status = "ok" if "OK" in response.upper() else "unexpected_response"
        return {"status": status, "provider": settings.llm_provider, "model": settings.llm_model}
    except Exception as exc:  # noqa: BLE001
        return {"status": "unavailable", "provider": settings.llm_provider, "reason": str(exc)}


# Shared startup status for health endpoint
_startup_status: dict[str, dict[str, str]] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _startup_status, settings

    # Clear settings cache so updated .env values take effect
    get_settings.cache_clear()
    settings = get_settings()
    knowledge_base.settings = settings

    # 1. Init DB
    init_db()
    logger.info("Database initialized.")

    # 2. Seed default data
    with SessionLocal() as db:
        seed_default_data(db)
    logger.info("Default data seeded.")

    # 3. Provider health checks (non-fatal)
    _startup_status["llm"] = _check_llm_health()
    _startup_status["ocr"] = _check_ocr_health()
    _startup_status["ml"] = _check_ml_health()
    _startup_status["embedding"] = _check_embedding_health()

    # 4. Index knowledge base
    try:
        count = knowledge_base.index_directory()
        logger.info("Knowledge base indexed: %d chunks.", count)
        _startup_status["knowledge"] = {"status": "indexed", "chunks": str(count)}
    except Exception as exc:
        logger.warning("Knowledge base indexing failed: %s", exc)
        _startup_status["knowledge"] = {"status": "failed", "reason": str(exc)}

    logger.info(
        "Startup complete. DEMO_MODE=%s LLM=%s(provider=%s model=%s) OCR=%s ML=%s EMBEDDING=%s KB_CHUNKS=%s",
        settings.demo_mode,
        _startup_status["llm"].get("status"),
        settings.llm_provider,
        settings.llm_model,
        _startup_status["ocr"].get("status"),
        _startup_status["ml"].get("status"),
        settings.embedding_provider,
        _startup_status["knowledge"].get("chunks", "0"),
    )
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Application Intelligence Platform — "
        "AI-assisted government scheme application processing with human-in-the-loop review."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_v1_prefix)


@app.exception_handler(ApplicationError)
async def application_error_handler(_: Request, exc: ApplicationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": {"code": exc.code, "message": exc.message}},
    )


@app.get("/health")
def health(deep: bool = False) -> dict:
    providers = dict(_startup_status)
    providers["database"] = _check_database_health()
    providers["knowledge"] = knowledge_base.health()
    if deep:
        providers["llm_deep"] = _check_llm_deep_health()
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "demo_mode": settings.demo_mode,
        "configuration": {
            "DEMO_MODE": settings.demo_mode,
            "LLM": providers.get("llm", {}).get("status"),
            "OCR": providers.get("ocr", {}).get("status"),
            "ML": providers.get("ml", {}).get("provider"),
            "EMBEDDING": settings.embedding_provider,
            "EMBEDDING_MODEL": settings.embedding_model,
            "KB_CHUNKS": providers.get("knowledge", {}).get("chunks", "0"),
        },
        "providers": providers,
    }
