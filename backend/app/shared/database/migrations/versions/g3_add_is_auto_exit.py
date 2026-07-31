"""Add is_auto_exit column to access_records

Revision ID: g3_add_is_auto_exit
Revises: g2_shift_session_fields
Create Date: 2026-07-28

"""
from alembic import op
import sqlalchemy as sa

revision = "g3_add_is_auto_exit"
down_revision = "g2_shift_session_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("access_records", sa.Column("is_auto_exit", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade():
    op.drop_column("access_records", "is_auto_exit")
