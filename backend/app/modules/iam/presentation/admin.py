from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.core.deps import CurrentSuperUser, DbSession

router = APIRouter(prefix="/iam/admin", tags=["Admin"])

RESETTABLE_TABLES = {
    "access_records": "Registros de acceso (entradas/salidas)",
    "shifts": "Turnos programados y ejecutados",
    "schedules": "Programaciones de turnos",
    "schedule_series": "Series de programación recurrente",
    "shift_templates": "Plantillas de turno",
    "payroll_records": "Registros de nómina liquidados",
    "payroll_periods": "Períodos de nómina creados",
    "payroll_concepts": "Conceptos de nómina personalizados",
    "location_history": "Historial de ubicaciones GPS",
    "route_history": "Historial de rutas recorridas",
    "audit_logs": "Registros de auditoría del sistema",
    "user_sessions": "Sesiones activas de usuarios",
}

SYSTEM_TABLES = {
    "companies", "branches",
    "employees", "departments", "job_positions", "cost_centers", "work_teams",
    "employee_dotaciones", "employee_documents",
    "users", "roles", "permissions", "role_permissions",
    "clients", "client_contacts", "client_locations",
    "contracts", "contract_types",
    "personas", "patients", "projects",
    "geofences",
}


class ResetTablesRequest(BaseModel):
    tables: list[str]


class ResetTablesResponse(BaseModel):
    success: bool
    reset_tables: list[str]
    message: str


@router.get("/reset-tables-list")
async def list_resettable_tables(current_user: CurrentSuperUser) -> dict:
    return {
        "tables": [{"name": k, "description": v} for k, v in RESETTABLE_TABLES.items()],
        "system_tables": sorted(SYSTEM_TABLES),
    }


@router.post("/reset-tables", response_model=ResetTablesResponse)
async def reset_tables(
    body: ResetTablesRequest,
    current_user: CurrentSuperUser,
    db: DbSession,
) -> ResetTablesResponse:
    invalid = [t for t in body.tables if t not in RESETTABLE_TABLES]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Tablas no permitidas: {', '.join(invalid)}. Solo se pueden restaurar tablas transaccionales.",
        )

    if not body.tables:
        raise HTTPException(status_code=400, detail="Debe especificar al menos una tabla")

    async with db.connection() as conn:
        for table in body.tables:
            await conn.execute(text(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE'))

    return ResetTablesResponse(
        success=True,
        reset_tables=body.tables,
        message=f"Datos eliminados correctamente de: {', '.join(body.tables)}",
    )
