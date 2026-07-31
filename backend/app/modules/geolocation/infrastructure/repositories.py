import json
import math
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_geolocation import Geofence, LocationHistory, RouteHistory


class GeofenceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, geofence_id: str) -> Geofence | None:
        result = await self.db.execute(select(Geofence).where(Geofence.id == geofence_id, Geofence.is_deleted == False))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Geofence:
        geofence = Geofence(**kwargs)
        self.db.add(geofence)
        await self.db.flush()
        return geofence

    async def update(self, geofence_id: str, **kwargs: dict) -> Geofence | None:
        await self.db.execute(update(Geofence).where(Geofence.id == geofence_id).values(**kwargs))
        await self.db.flush()
        return await self.get_by_id(geofence_id)

    async def list_by_company(self, company_id: str) -> list[Geofence]:
        result = await self.db.execute(
            select(Geofence).where(Geofence.company_id == company_id, Geofence.is_deleted == False)
        )
        return list(result.scalars().all())

    async def list_active(self, company_id: str) -> list[Geofence]:
        result = await self.db.execute(
            select(Geofence).where(
                Geofence.company_id == company_id,
                Geofence.is_active == True,
                Geofence.is_deleted == False,
            )
        )
        return list(result.scalars().all())


class LocationHistoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs: dict) -> LocationHistory:
        loc = LocationHistory(**kwargs)
        self.db.add(loc)
        await self.db.flush()
        return loc

    async def bulk_create(self, records: list[dict]) -> list[LocationHistory]:
        locs = [LocationHistory(**r) for r in records]
        self.db.add_all(locs)
        await self.db.flush()
        return locs

    async def list_by_employee(
        self, employee_id: str, start_date: str | None = None, end_date: str | None = None, limit: int = 500
    ) -> list[LocationHistory]:
        query = select(LocationHistory).where(LocationHistory.employee_id == employee_id)
        if start_date:
            query = query.where(LocationHistory.timestamp >= start_date)
        if end_date:
            query = query.where(LocationHistory.timestamp <= end_date)
        result = await self.db.execute(query.order_by(LocationHistory.timestamp.desc()).limit(limit))
        return list(result.scalars().all())

    async def get_latest_by_employee(self, employee_id: str) -> LocationHistory | None:
        result = await self.db.execute(
            select(LocationHistory)
            .where(LocationHistory.employee_id == employee_id)
            .order_by(LocationHistory.timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def count_active_employees(self, company_id: str, since_minutes: int = 30) -> int:
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=since_minutes)).isoformat()
        result = await self.db.execute(
            select(func.count(func.distinct(LocationHistory.employee_id))).where(
                LocationHistory.timestamp >= cutoff
            )
        )
        return result.scalar() or 0


class RouteHistoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs: dict) -> RouteHistory:
        route = RouteHistory(**kwargs)
        self.db.add(route)
        await self.db.flush()
        return route

    async def list_by_employee(self, employee_id: str, start_date: str | None = None, end_date: str | None = None) -> list[RouteHistory]:
        query = select(RouteHistory).where(RouteHistory.employee_id == employee_id)
        if start_date:
            query = query.where(RouteHistory.date >= start_date)
        if end_date:
            query = query.where(RouteHistory.date <= end_date)
        result = await self.db.execute(query.order_by(RouteHistory.date.desc()))
        return list(result.scalars().all())
