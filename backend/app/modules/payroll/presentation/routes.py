from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.payroll.application.service import PayrollService
from app.modules.payroll.infrastructure.repositories import (
    PayrollConceptRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
)
from app.modules.payroll.presentation.schemas import (
    PayrollCalculateRequest,
    PayrollListResponse,
    PayrollPeriodCreateRequest,
)

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def get_service(db: DbSession) -> PayrollService:
    return PayrollService(
        period_repo=PayrollPeriodRepository(db),
        record_repo=PayrollRecordRepository(db),
        concept_repo=PayrollConceptRepository(db),
    )


@router.post("/periods", status_code=201)
async def create_period(body: PayrollPeriodCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.create_period(**body.model_dump())


@router.get("/periods")
async def list_periods(
    company_id: str, current_user: CurrentUser, db: DbSession,
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
) -> PayrollListResponse:
    service = get_service(db)
    result = await service.list_periods(company_id, page=page, page_size=page_size)
    return PayrollListResponse(**result.__dict__)


@router.get("/periods/{period_id}")
async def get_period(period_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.get_period(period_id)


@router.post("/calculate")
async def calculate_payroll(body: PayrollCalculateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.calculate_payroll(
        period_id=body.period_id, employee_id=body.employee_id,
        contract={"id": body.contract_id, "company_id": body.company_id,
                  "salary": body.salary, "transportation_assistance": body.transportation_assistance,
                  "daily_hours": body.daily_hours, "risk_level": body.risk_level},
        overtime_hours=body.overtime_hours, night_hours=body.night_hours,
        sunday_holiday_hours=body.sunday_holiday_hours, bonuses=body.bonuses,
        commissions=body.commissions, other_earnings=body.other_earnings,
        worked_days=body.worked_days,
    )


@router.get("/periods/{period_id}/records")
async def list_records(period_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    service = get_service(db)
    return await service.list_records_by_period(period_id)


@router.post("/periods/{period_id}/close")
async def close_period(period_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.close_period(period_id)
