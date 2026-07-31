"""unify auth tables: user_sessions/audit_logs FK to employees, fix DateTime fields

Revision ID: f3_auth_unification
Revises: f2_client_unification
Create Date: 2026-07-25
"""
from alembic import op
import sqlalchemy as sa

revision = "f3_auth_unification"
down_revision = "f2_client_unification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Migrate data: map user_id -> employee_id via users.employee_id ──
    op.execute("""
        UPDATE user_sessions us
        SET user_id = u.employee_id
        FROM users u
        WHERE us.user_id = u.id AND u.employee_id IS NOT NULL
    """)
    op.execute("""
        UPDATE audit_logs al
        SET user_id = u.employee_id
        FROM users u
        WHERE al.user_id = u.id AND u.employee_id IS NOT NULL
    """)
    # Null out any sessions/audit_logs for users without employees
    op.execute("UPDATE user_sessions SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM employees)")
    op.execute("UPDATE audit_logs SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM employees)")

    # ── user_sessions: user_id -> employee_id (FK to employees) ──
    op.drop_index("ix_user_sessions_user_id", "user_sessions")
    op.drop_constraint("fk_user_sessions_user_id_users", "user_sessions", type_="foreignkey")
    op.alter_column("user_sessions", "user_id", new_column_name="employee_id")
    op.create_foreign_key(
        "fk_user_sessions_employee_id_employees", "user_sessions", "employees",
        ["employee_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_user_sessions_employee_id", "user_sessions", ["employee_id"])

    # Fix expires_at: String(50) -> DateTime
    op.alter_column(
        "user_sessions", "expires_at",
        existing_type=sa.String(50),
        type_=sa.DateTime(timezone=True),
        nullable=False,
        using="expires_at::timestamp with time zone",
    )

    # ── audit_logs: user_id -> employee_id (FK to employees) ──
    op.drop_index("ix_audit_logs_user_id", "audit_logs")
    op.drop_constraint("fk_audit_logs_user_id_users", "audit_logs", type_="foreignkey")
    op.alter_column("audit_logs", "user_id", new_column_name="employee_id")
    op.create_foreign_key(
        "fk_audit_logs_employee_id_employees", "audit_logs", "employees",
        ["employee_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_audit_logs_employee_id", "audit_logs", ["employee_id"])

    # ── users: fix String DateTime fields ──
    op.alter_column(
        "users", "last_login",
        existing_type=sa.String(50),
        type_=sa.DateTime(timezone=True),
        nullable=True,
        using="last_login::timestamp with time zone",
    )
    op.alter_column(
        "users", "locked_until",
        existing_type=sa.String(50),
        type_=sa.DateTime(timezone=True),
        nullable=True,
        using="locked_until::timestamp with time zone",
    )

    # ── notifications: add FK constraint on employee_id (currently dangling) ──
    op.create_foreign_key(
        "fk_notifications_employee_id_employees", "notifications", "employees",
        ["employee_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    # notifications FK
    op.drop_constraint("fk_notifications_employee_id_employees", "notifications", type_="foreignkey")

    # users DateTime fields back to String
    op.alter_column(
        "users", "locked_until",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.String(50),
        nullable=True,
        using="locked_until::text",
    )
    op.alter_column(
        "users", "last_login",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.String(50),
        nullable=True,
        using="last_login::text",
    )

    # audit_logs: revert
    op.drop_index("ix_audit_logs_employee_id", "audit_logs")
    op.drop_constraint("fk_audit_logs_employee_id_employees", "audit_logs", type_="foreignkey")
    op.alter_column("audit_logs", "employee_id", new_column_name="user_id")
    op.create_foreign_key(
        "fk_audit_logs_user_id_users", "audit_logs", "users",
        ["user_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])

    # user_sessions: revert
    op.drop_index("ix_user_sessions_employee_id", "user_sessions")
    op.drop_constraint("fk_user_sessions_employee_id_employees", "user_sessions", type_="foreignkey")
    op.alter_column(
        "user_sessions", "expires_at",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.String(50),
        nullable=False,
        using="expires_at::text",
    )
    op.alter_column("user_sessions", "employee_id", new_column_name="user_id")
    op.create_foreign_key(
        "fk_user_sessions_user_id_users", "user_sessions", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
