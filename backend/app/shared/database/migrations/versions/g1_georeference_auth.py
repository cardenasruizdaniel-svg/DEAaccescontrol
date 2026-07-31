"""add can_assign_georeference to employees

Revision ID: g1_georeference_auth
Revises: f3_auth_unification
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "g1_georeference_auth"
down_revision = "f3_auth_unification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("can_assign_georeference", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("employees", "can_assign_georeference")
