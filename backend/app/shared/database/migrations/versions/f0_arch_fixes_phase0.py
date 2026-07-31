"""phase 0 architectural fixes: FK shifts.project_id

Revision ID: f0_arch_fixes_phase0
Revises: 2c091c3c086a
Create Date: 2026-07-25
"""
from alembic import op
import sqlalchemy as sa

revision = "f0_arch_fixes_phase0"
down_revision = "2c091c3c086a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Clean empty-string project_ids before adding FK
    op.execute("UPDATE shifts SET project_id = NULL WHERE project_id = ''")

    # 0.8: Add FK constraint for shifts.project_id -> projects.id
    op.create_foreign_key(
        "fk_shifts_project_id_projects",
        "shifts", "projects",
        ["project_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_shifts_project_id_projects", "shifts", type_="foreignkey")
