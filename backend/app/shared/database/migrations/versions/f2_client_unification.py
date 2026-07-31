"""add client unification fields: legal_name, timezone, settings_json

Revision ID: f2_client_unification
Revises: f1_employee_access_fields
Create Date: 2026-07-25
"""
from alembic import op
import sqlalchemy as sa

revision = "f2_client_unification"
down_revision = "f1_employee_access_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("legal_name", sa.String(300), nullable=True))
    op.add_column("clients", sa.Column("timezone", sa.String(50), server_default="America/Bogota", nullable=False))
    op.add_column("clients", sa.Column("settings_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "settings_json")
    op.drop_column("clients", "timezone")
    op.drop_column("clients", "legal_name")
