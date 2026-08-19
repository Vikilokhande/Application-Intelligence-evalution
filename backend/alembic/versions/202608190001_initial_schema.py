"""Initial schema for the application intelligence platform.

Revision ID: 202608190001
Revises:
Create Date: 2026-08-19
"""
from pathlib import Path
import sys

from alembic import op

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db.base import Base  # noqa: E402
from app.models import entities  # noqa: F401,E402


revision = "202608190001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)

