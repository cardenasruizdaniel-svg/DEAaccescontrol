"""rename_patients_to_personas_and_add_schedule_series

Revision ID: 2c091c3c086a
Revises: e2f978315ee4
Create Date: 2026-07-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '2c091c3c086a'
down_revision: Union[str, None] = 'e2f978315ee4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop FK and indexes before rename
    op.drop_constraint('fk_shifts_patient_id_patients', 'shifts', type_='foreignkey')
    op.drop_index('ix_patients_client_id', table_name='patients')
    op.drop_index('ix_patients_document_number', table_name='patients')
    op.drop_index('ix_patients_status', table_name='patients')

    # 2. Rename patients -> personas
    op.rename_table('patients', 'personas')

    # 3. Rename patient_id -> persona_id on shifts
    op.alter_column('shifts', 'patient_id', new_column_name='persona_id')

    # 4. Recreate indexes and FK on new table/column names
    op.create_index('ix_personas_client_id', 'personas', ['client_id'])
    op.create_index('ix_personas_document_number', 'personas', ['document_number'])
    op.create_index('ix_personas_status', 'personas', ['status'])
    op.create_foreign_key(
        'fk_shifts_persona_id_personas', 'shifts', 'personas', ['persona_id'], ['id']
    )

    # 5. Add schedule_series table (groups recurring schedules)
    op.create_table(
        'schedule_series',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('company_id', sa.String(36), sa.ForeignKey('companies.id'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('client_id', sa.String(36), sa.ForeignKey('clients.id'), nullable=True),
        sa.Column('persona_id', sa.String(36), sa.ForeignKey('personas.id'), nullable=True),
        sa.Column('employee_id', sa.String(36), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('shift_template_id', sa.String(36), sa.ForeignKey('shift_templates.id'), nullable=True),
        sa.Column('recurrence_type', sa.String(20), nullable=False, server_default='none'),
        sa.Column('recurrence_days', sa.String(50), nullable=True),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date, nullable=True),
        sa.Column('max_occurrences', sa.Integer, nullable=True),
        sa.Column('default_start_time', sa.String(5), nullable=False),
        sa.Column('default_end_time', sa.String(5), nullable=False),
        sa.Column('default_break_minutes', sa.Integer, nullable=False, server_default='60'),
        sa.Column('default_priority', sa.String(10), nullable=False, server_default='normal'),
        sa.Column('default_notes', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), nullable=False, server_default='#3b82f6'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('total_generated', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
    )
    op.create_index('ix_schedule_series_company_id', 'schedule_series', ['company_id'])

    # 6. Add new columns to schedules
    op.add_column('schedules', sa.Column('series_id', sa.String(36),
                  sa.ForeignKey('schedule_series.id'), nullable=True))
    op.create_index('ix_schedules_series_id', 'schedules', ['series_id'])
    op.add_column('schedules', sa.Column('recurrence_type', sa.String(20),
                  nullable=False, server_default='none'))
    op.add_column('schedules', sa.Column('recurrence_days', sa.String(50), nullable=True))
    op.add_column('schedules', sa.Column('occurrence_number', sa.Integer, nullable=True))
    op.add_column('schedules', sa.Column('shift_template_id', sa.String(36),
                  sa.ForeignKey('shift_templates.id'), nullable=True))
    op.add_column('schedules', sa.Column('persona_id', sa.String(36),
                  sa.ForeignKey('personas.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('schedules', 'persona_id')
    op.drop_column('schedules', 'shift_template_id')
    op.drop_column('schedules', 'occurrence_number')
    op.drop_column('schedules', 'recurrence_days')
    op.drop_column('schedules', 'recurrence_type')
    op.drop_index('ix_schedules_series_id', table_name='schedules')
    op.drop_column('schedules', 'series_id')
    op.drop_index('ix_schedule_series_company_id', table_name='schedule_series')
    op.drop_table('schedule_series')

    op.drop_constraint('fk_shifts_persona_id_personas', 'shifts', type_='foreignkey')
    op.drop_index('ix_personas_status', table_name='personas')
    op.drop_index('ix_personas_document_number', table_name='personas')
    op.drop_index('ix_personas_client_id', table_name='personas')
    op.rename_table('personas', 'patients')
    op.alter_column('shifts', 'persona_id', new_column_name='patient_id')
    op.create_index('ix_patients_status', 'patients', ['status'])
    op.create_index('ix_patients_document_number', 'patients', ['document_number'])
    op.create_index('ix_patients_client_id', 'patients', ['client_id'])
    op.create_foreign_key(
        'fk_shifts_patient_id_patients', 'shifts', 'patients', ['patient_id'], ['id']
    )
