from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.dashboard.application.service import DashboardService
from app.modules.dashboard.infrastructure.repositories import DashboardRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_service(db: DbSession) -> DashboardService:
    return DashboardService(repo=DashboardRepository(db))


@router.get("")
async def get_dashboard(company_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).get_executive_dashboard(company_id)


@router.get("/employee-status")
async def get_employee_status(company_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).get_employee_status_map(company_id)


@router.get("/recent-activity")
async def get_recent_activity(
    current_user: CurrentUser, db: DbSession,
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    return await get_service(db).get_recent_activity(limit)


@router.get("/hourly-trend")
async def get_hourly_trend(company_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    return await get_service(db).get_hourly_trend(company_id)
