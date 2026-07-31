"""add shift session fields to access_records

Revision ID: g2_shift_session_fields
Revises: g1_georeference_auth
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "g2_shift_session_fields"
down_revision = "g1_georeference_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "access_records",
        sa.Column("auto_closed", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "access_records",
        sa.Column("is_late_arrival", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "access_records",
        sa.Column("is_early_departure", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("access_records", "is_early_departure")
    op.drop_column("access_records", "is_late_arrival")
    op.drop_column("access_records", "auto_closed")
