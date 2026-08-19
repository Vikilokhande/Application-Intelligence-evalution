import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_application_intelligence.db")
os.environ.setdefault("UPLOAD_DIR", str(ROOT / "data" / "test_uploads"))
os.environ.setdefault("CHROMA_PATH", str(ROOT / "data" / "test_chroma"))

import pytest  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.models import entities  # noqa: F401,E402
from app.services.seed import seed_default_data  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_default_data(db)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    with SessionLocal() as db:
        yield db

