from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Application Intelligence Platform"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./application_intelligence.db"
    chroma_path: str = str(PROJECT_ROOT / "data" / "chroma")
    knowledge_path: str = str(PROJECT_ROOT / "data" / "knowledge")
    upload_dir: str = str(PROJECT_ROOT / "data" / "uploads")
    max_upload_bytes: int = 25 * 1024 * 1024
    allowed_extensions: str = "pdf,docx,xlsx,csv,jpg,jpeg,png,json"
    cors_origins: str = "http://localhost:5173"
    demo_mode: bool = True
    auth_enabled: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_extension_set(self) -> set[str]:
        return {item.strip().lower().lstrip(".") for item in self.allowed_extensions.split(",") if item.strip()}

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
