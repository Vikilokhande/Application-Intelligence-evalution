"""
202608200002_add_classification_ocr_and_policy_fields.py

Add production-required fields to Document, FeatureSet, ModelPrediction,
and ReviewerAssignment tables.

Revision:  202608200002
Revises:   202608190001
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision: str = "202608200002"
down_revision: str = "202608190001"
branch_labels = None
depends_on = None


def _existing_columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_missing_columns(table_name: str, columns: list[sa.Column]) -> None:
    existing = _existing_columns(table_name)
    missing = [column for column in columns if column.name not in existing]
    if not missing:
        return
    with op.batch_alter_table(table_name, schema=None) as batch_op:
        for column in missing:
            batch_op.add_column(column)


def _drop_existing_columns(table_name: str, column_names: list[str]) -> None:
    existing = _existing_columns(table_name)
    present = [column_name for column_name in column_names if column_name in existing]
    if not present:
        return
    with op.batch_alter_table(table_name, schema=None) as batch_op:
        for column_name in present:
            batch_op.drop_column(column_name)


def upgrade() -> None:
    _add_missing_columns(
        "documents",
        [
            sa.Column("classification_confidence", sa.Float(), nullable=True),
            sa.Column("classification_provider", sa.String(length=120), nullable=True),
            sa.Column("ocr_provider", sa.String(length=80), nullable=True),
            sa.Column("ocr_confidence", sa.Float(), nullable=True),
            sa.Column("ocr_status", sa.String(length=80), nullable=True),
        ],
    )
    _add_missing_columns(
        "features",
        [sa.Column("feature_version", sa.String(length=40), nullable=False, server_default="1.0")],
    )
    _add_missing_columns(
        "model_predictions",
        [
            sa.Column("feature_version", sa.String(length=40), nullable=False, server_default="1.0"),
            sa.Column("policy_version", sa.String(length=40), nullable=False, server_default=""),
            sa.Column("provider", sa.String(length=80), nullable=False, server_default=""),
        ],
    )
    _add_missing_columns(
        "reviewer_assignments",
        [sa.Column("policy_version", sa.String(length=40), nullable=False, server_default="")],
    )


def downgrade() -> None:
    _drop_existing_columns("reviewer_assignments", ["policy_version"])
    _drop_existing_columns("model_predictions", ["provider", "policy_version", "feature_version"])
    _drop_existing_columns("features", ["feature_version"])
    _drop_existing_columns(
        "documents",
        [
            "ocr_status",
            "ocr_confidence",
            "ocr_provider",
            "classification_provider",
            "classification_confidence",
        ],
    )
