"""enhance_user_iam_fields

Revision ID: e2f978315ee4
Revises: ece1bd1d3822
Create Date: 2026-07-24 22:09:47.144071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e2f978315ee4'
down_revision: Union[str, None] = 'ece1bd1d3822'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- User IAM fields ---
    op.add_column('users', sa.Column('account_status', sa.String(length=20), nullable=False, server_default='active'))
    op.add_column('users', sa.Column('platform_access', sa.String(length=20), nullable=False, server_default='both'))
    op.add_column('users', sa.Column('force_password_change', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('last_platform', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('first_login_completed', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('biometric_enrolled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('activation_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deactivation_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('app_status', sa.String(length=20), nullable=False, server_default='not_installed'))
    op.add_column('users', sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_users_employee_id'), 'users', ['employee_id'], unique=False)
    op.create_foreign_key(op.f('fk_users_employee_id_employees'), 'users', 'employees', ['employee_id'], ['id'])

    # --- Role fields ---
    op.add_column('roles', sa.Column('display_name', sa.String(length=100), nullable=True))
    op.add_column('roles', sa.Column('color', sa.String(length=20), nullable=True))
    op.add_column('roles', sa.Column('icon', sa.String(length=50), nullable=True))

    # --- Permission fields ---
    op.add_column('permissions', sa.Column('display_name', sa.String(length=100), nullable=True))

    # --- UserSession fields ---
    op.add_column('user_sessions', sa.Column('platform', sa.String(length=20), nullable=False, server_default='web'))
    op.add_column('user_sessions', sa.Column('device_model', sa.String(length=200), nullable=True))
    op.add_column('user_sessions', sa.Column('device_os', sa.String(length=100), nullable=True))

    # --- AuditLog field ---
    op.add_column('audit_logs', sa.Column('platform', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('audit_logs', 'platform')
    op.drop_column('user_sessions', 'device_os')
    op.drop_column('user_sessions', 'device_model')
    op.drop_column('user_sessions', 'platform')
    op.drop_column('permissions', 'display_name')
    op.drop_column('roles', 'icon')
    op.drop_column('roles', 'color')
    op.drop_column('roles', 'display_name')
    op.drop_constraint(op.f('fk_users_employee_id_employees'), 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_employee_id'), table_name='users')
    op.drop_column('users', 'last_sync_at')
    op.drop_column('users', 'app_status')
    op.drop_column('users', 'deactivation_date')
    op.drop_column('users', 'activation_date')
    op.drop_column('users', 'biometric_enrolled')
    op.drop_column('users', 'first_login_completed')
    op.drop_column('users', 'last_platform')
    op.drop_column('users', 'password_expires_at')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'force_password_change')
    op.drop_column('users', 'platform_access')
    op.drop_column('users', 'account_status')
