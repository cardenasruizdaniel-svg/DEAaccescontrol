"""add_shift_templates_and_enhance_shifts

Revision ID: d3f3f538e4c9
Revises: 95f732f3c8b3
Create Date: 2026-07-24 20:21:59.530905

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd3f3f538e4c9'
down_revision: Union[str, None] = '95f732f3c8b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('shift_templates',
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False),
        sa.Column('start_time', sa.String(length=5), nullable=False),
        sa.Column('end_time', sa.String(length=5), nullable=False),
        sa.Column('duration_hours', sa.Float(), nullable=False),
        sa.Column('shift_type', sa.String(length=30), nullable=False),
        sa.Column('observations', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('updated_by', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_shift_templates_company_id', 'shift_templates', ['company_id'], unique=False)

    op.add_column('shifts', sa.Column('patient_id', sa.String(length=36), nullable=True))
    op.add_column('shifts', sa.Column('shift_template_id', sa.String(length=36), nullable=True))
    op.add_column('shifts', sa.Column('color', sa.String(length=20), nullable=False, server_default='#3b82f6'))
    op.add_column('shifts', sa.Column('observations', sa.Text(), nullable=True))
    op.add_column('shifts', sa.Column('history_json', sa.Text(), nullable=True))
    op.create_index('ix_shifts_client_id', 'shifts', ['client_id'], unique=False)
    op.create_index('ix_shifts_patient_id', 'shifts', ['patient_id'], unique=False)
    op.create_foreign_key('fk_shifts_patient_id_patients', 'shifts', 'patients', ['patient_id'], ['id'])
    op.create_foreign_key('fk_shifts_shift_template_id_shift_templates', 'shifts', 'shift_templates', ['shift_template_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_shifts_patient_id_patients', 'shifts', type_='foreignkey')
    op.drop_constraint('fk_shifts_shift_template_id_shift_templates', 'shifts', type_='foreignkey')
    op.drop_index('ix_shifts_patient_id', table_name='shifts')
    op.drop_index('ix_shifts_client_id', table_name='shifts')
    op.drop_column('shifts', 'history_json')
    op.drop_column('shifts', 'observations')
    op.drop_column('shifts', 'color')
    op.drop_column('shifts', 'shift_template_id')
    op.drop_column('shifts', 'patient_id')
    op.drop_index('ix_shift_templates_company_id', table_name='shift_templates')
    op.drop_table('shift_templates')
