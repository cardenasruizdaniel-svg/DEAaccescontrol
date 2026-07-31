"""add employee access fields for unified employee-user module

Revision ID: f1_employee_access_fields
Revises: f0_arch_fixes_phase0
Create Date: 2026-07-25
"""
from alembic import op
import sqlalchemy as sa

revision = "f1_employee_access_fields"
down_revision = "f0_arch_fixes_phase0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- Campos de acceso al sistema --
    op.add_column("employees", sa.Column("username", sa.String(50), nullable=True, unique=True))
    op.add_column("employees", sa.Column("hashed_password", sa.String(200), nullable=True))
    op.add_column("employees", sa.Column("role_id", sa.String(36), sa.ForeignKey("roles.id"), nullable=True))
    op.add_column("employees", sa.Column("platform_access", sa.String(20), server_default="none", nullable=False))
    op.add_column("employees", sa.Column("account_status", sa.String(20), server_default="inactive", nullable=False))
    op.add_column("employees", sa.Column("is_superuser", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("employees", sa.Column("force_password_change", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("employees", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("last_login", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("last_platform", sa.String(20), nullable=True))
    op.add_column("employees", sa.Column("failed_login_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False))
    op.add_column("employees", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("first_login_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("employees", sa.Column("biometric_enrolled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("employees", sa.Column("mfa_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("employees", sa.Column("mfa_secret", sa.String(100), nullable=True))
    op.add_column("employees", sa.Column("app_status", sa.String(20), server_default="not_installed", nullable=False))
    op.add_column("employees", sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True))

    # -- Sync existing User data into Employee for admin user --
    op.execute("""
        UPDATE employees e
        SET
            username = u.username,
            hashed_password = u.hashed_password,
            role_id = u.role_id,
            platform_access = u.platform_access,
            account_status = u.account_status,
            is_superuser = u.is_superuser,
            force_password_change = u.force_password_change,
            password_changed_at = u.password_changed_at,
            last_login = u.last_login::timestamptz,
            last_platform = u.last_platform,
            failed_login_attempts = u.failed_login_attempts,
            locked_until = CASE WHEN u.locked_until IS NOT NULL THEN u.locked_until::timestamptz ELSE NULL END,
            first_login_completed = u.first_login_completed,
            biometric_enrolled = u.biometric_enrolled,
            mfa_enabled = u.mfa_enabled,
            mfa_secret = u.mfa_secret,
            app_status = u.app_status
        FROM users u
        WHERE e.id = u.employee_id AND u.employee_id IS NOT NULL
    """)

    # -- Create index for username lookup --
    op.create_index("ix_employees_username", "employees", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_employees_username", table_name="employees")
    op.drop_column("employees", "last_sync_at")
    op.drop_column("employees", "app_status")
    op.drop_column("employees", "mfa_secret")
    op.drop_column("employees", "mfa_enabled")
    op.drop_column("employees", "biometric_enrolled")
    op.drop_column("employees", "first_login_completed")
    op.drop_column("employees", "locked_until")
    op.drop_column("employees", "failed_login_attempts")
    op.drop_column("employees", "last_platform")
    op.drop_column("employees", "last_login")
    op.drop_column("employees", "password_changed_at")
    op.drop_column("employees", "force_password_change")
    op.drop_column("employees", "is_superuser")
    op.drop_column("employees", "account_status")
    op.drop_column("employees", "platform_access")
    op.drop_column("employees", "role_id")
    op.drop_column("employees", "hashed_password")
    op.drop_column("employees", "username")
