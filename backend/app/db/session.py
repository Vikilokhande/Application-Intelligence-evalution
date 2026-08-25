from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base


settings = get_settings()


def _connect_args(database_url: str) -> dict[str, object]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


engine = create_engine(settings.database_url, connect_args=_connect_args(settings.database_url), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    from app.models import entities  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_columns()


def _migrate_sqlite_columns() -> None:
    from sqlalchemy import text
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.connect() as conn:
        # Check documents columns
        result = conn.execute(text("PRAGMA table_info(documents)"))
        existing_cols = {row[1] for row in result.fetchall()}
        if existing_cols:
            doc_cols_to_add = [
                ("classification_confidence", "FLOAT"),
                ("classification_provider", "VARCHAR(120)"),
                ("ocr_provider", "VARCHAR(80)"),
                ("ocr_confidence", "FLOAT"),
                ("ocr_status", "VARCHAR(80)"),
            ]
            for col_name, col_type in doc_cols_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}"))

        # Check features columns
        result = conn.execute(text("PRAGMA table_info(features)"))
        existing_cols = {row[1] for row in result.fetchall()}
        if existing_cols and "feature_version" not in existing_cols:
            conn.execute(text("ALTER TABLE features ADD COLUMN feature_version VARCHAR(40) DEFAULT '1.0'"))

        # Check predictions columns
        result = conn.execute(text("PRAGMA table_info(predictions)"))
        existing_cols = {row[1] for row in result.fetchall()}
        if existing_cols:
            for col_name, col_type in [
                ("feature_version", "VARCHAR(40)"),
                ("policy_version", "VARCHAR(40)"),
                ("provider", "VARCHAR(80)"),
            ]:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col_name} {col_type}"))

        # Check reviewer_assignments columns
        result = conn.execute(text("PRAGMA table_info(reviewer_assignments)"))
        existing_cols = {row[1] for row in result.fetchall()}
        if existing_cols and "policy_version" not in existing_cols:
            conn.execute(text("ALTER TABLE reviewer_assignments ADD COLUMN policy_version VARCHAR(40) DEFAULT '1.0'"))

        conn.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

