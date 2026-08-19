from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.routes import router
from app.core.config import get_settings
from app.core.exceptions import ApplicationError
from app.core.logging import configure_logging
from app.db.session import SessionLocal, init_db
from app.knowledge.service import knowledge_base
from app.services.seed import seed_default_data


settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed_default_data(db)
    knowledge_base.index_directory()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Local-first enterprise AI application processing and reviewer decision-support platform.",
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
    return JSONResponse(status_code=400, content={"detail": {"code": exc.code, "message": exc.message}})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
