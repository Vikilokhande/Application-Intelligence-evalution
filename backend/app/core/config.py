from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────────────────
    app_name: str = "Application Intelligence Platform"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    demo_mode: bool = True
    auth_enabled: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./application_intelligence.db"

    # ── Storage ───────────────────────────────────────────────────────────────
    chroma_path: str = str(PROJECT_ROOT / "data" / "chroma")
    knowledge_path: str = str(PROJECT_ROOT / "data" / "knowledge")
    upload_dir: str = str(PROJECT_ROOT / "data" / "uploads")
    max_upload_bytes: int = 25 * 1024 * 1024
    allowed_extensions: str = "pdf,docx,xlsx,csv,jpg,jpeg,png,json,txt,tiff,tif"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173"

    # ── LLM Provider ─────────────────────────────────────────────────────────
    llm_provider: str = "groq"
    llm_model: str = "openai/gpt-oss-20b"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    # Primary key name (normalized); falls back to legacy QROQ_API_KEY
    llm_api_key: str = ""
    qroq_api_key: str = ""      # legacy env var support
    groq_api_key: str = ""      # canonical env var support
    llm_temperature: float = 0.0
    llm_timeout: int = 60
    llm_max_tokens: int = 4096
    llm_max_retries: int = 3

    # ── OCR ───────────────────────────────────────────────────────────────────
    ocr_enabled: bool = True
    ocr_provider: str = "tesseract"          # tesseract | none
    ocr_language: str = "eng"
    ocr_timeout: int = 60
    ocr_min_text_length: int = 100           # chars — below this, try OCR
    ocr_min_text_ratio: float = 0.10         # chars/bytes ratio — below this, try OCR
    tesseract_cmd: str = ""                  # optional path to tesseract.exe on Windows

    # ── Embedding ─────────────────────────────────────────────────────────────
    embedding_provider: str = "sentence_transformers"  # sentence_transformers | local
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_api_key: str = ""
    embedding_base_url: str = ""

    # ── ML Scoring ───────────────────────────────────────────────────────────
    ml_provider: str = "xgboost"             # xgboost | unavailable
    ml_model_path: str = str(PROJECT_ROOT / "ml" / "models" / "model.ubj")
    ml_feature_schema_path: str = str(PROJECT_ROOT / "ml" / "models" / "feature_schema.json")
    ml_model_version: str = ""               # loaded from training_metadata at runtime

    # ── Validation Thresholds ─────────────────────────────────────────────────
    suspicious_cost_threshold: float = 10_000_000.0   # ₹1 crore
    contradiction_absolute_tolerance: float = 5_000.0
    contradiction_relative_tolerance: float = 0.02    # 2%

    # ── Routing Policy ────────────────────────────────────────────────────────
    routing_policy_version: str = "1.0"
    routing_confidence_threshold: float = 0.55
    routing_senior_risk_threshold: float = 70.0
    routing_expert_risk_threshold: float = 40.0

    # ── Security ──────────────────────────────────────────────────────────────
    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Computed helpers ──────────────────────────────────────────────────────

    @model_validator(mode="after")
    def _resolve_api_key(self) -> "Settings":
        """Normalise the Groq/QROQ API key from whichever env var is set."""
        if not self.llm_api_key:
            # Prefer the canonically named var, fall back to legacy typo var
            self.llm_api_key = self.groq_api_key or self.qroq_api_key
        return self

    @property
    def allowed_extension_set(self) -> set[str]:
        return {item.strip().lower().lstrip(".") for item in self.allowed_extensions.split(",") if item.strip()}

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def effective_llm_api_key(self) -> str:
        """Return resolved key without ever logging it."""
        return self.llm_api_key

    def has_llm_credentials(self) -> bool:
        return bool(self.llm_api_key)

    def validate_llm_configuration(self) -> None:
        """Raise ConfigurationError if LLM is needed but misconfigured."""
        from app.core.exceptions import ConfigurationError  # local import to avoid circular
        if self.llm_provider != "none" and not self.demo_mode:
            if not self.llm_api_key:
                raise ConfigurationError(
                    f"LLM_API_KEY (or QROQ_API_KEY / GROQ_API_KEY) is required when "
                    f"LLM_PROVIDER='{self.llm_provider}' and DEMO_MODE=false."
                )

    def validate_ocr_configuration(self) -> None:
        """Raise ConfigurationError if OCR is enabled but no provider is set."""
        from app.core.exceptions import ConfigurationError
        if self.ocr_enabled and self.ocr_provider == "none":
            raise ConfigurationError(
                "OCR_ENABLED=true but OCR_PROVIDER=none. "
                "Set OCR_PROVIDER=tesseract or OCR_ENABLED=false."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
