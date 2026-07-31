from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.geolocation.application.service import GeolocationService
from app.modules.geolocation.infrastructure.repositories import (
    GeofenceRepository,
    LocationHistoryRepository,
    RouteHistoryRepository,
)
from app.modules.geolocation.presentation.schemas import (
    GeofenceCreateRequest,
    LocationRecordRequest,
)

router = APIRouter(prefix="/geolocation", tags=["Geolocation"])


def get_service(db: DbSession) -> GeolocationService:
    return GeolocationService(
        geofence_repo=GeofenceRepository(db),
        location_repo=LocationHistoryRepository(db),
        route_repo=RouteHistoryRepository(db),
    )


@router.post("/geofences", status_code=201)
async def create_geofence(body: GeofenceCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).create_geofence(**body.model_dump())


@router.get("/geofences")
async def list_geofences(company_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    return await get_service(db).list_geofences(company_id)


@router.put("/geofences/{geofence_id}")
async def update_geofence(geofence_id: str, current_user: CurrentUser, db: DbSession, name: str | None = None, radius: float | None = None) -> dict:
    kwargs = {}
    if name is not None:
        kwargs["name"] = name
    if radius is not None:
        kwargs["radius"] = radius
    return await get_service(db).update_geofence(geofence_id, **kwargs)


@router.post("/location")
async def record_location(body: LocationRecordRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).record_location(**body.model_dump())


@router.get("/location/employee/{employee_id}")
async def get_employee_location(employee_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).get_employee_location(employee_id)


@router.get("/location/employee/{employee_id}/history")
async def get_employee_history(
    employee_id: str, current_user: CurrentUser, db: DbSession,
    start_date: str | None = Query(None), end_date: str | None = Query(None),
) -> list[dict]:
    return await get_service(db).get_employee_history(employee_id, start_date=start_date, end_date=end_date)


@router.get("/active-map")
async def get_active_employees_map(
    company_id: str, current_user: CurrentUser, db: DbSession,
    since_minutes: int = Query(30, ge=1, le=1440),
) -> dict:
    return await get_service(db).get_active_employees_map(company_id, since_minutes)


@router.post("/route/calculate")
async def calculate_route(employee_id: str, date: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).calculate_route(employee_id, date)
