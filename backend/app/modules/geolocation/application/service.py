import math
from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.modules.geolocation.infrastructure.repositories import (
    GeofenceRepository,
    LocationHistoryRepository,
    RouteHistoryRepository,
)


class GeolocationService:
    EARTH_RADIUS_M = 6371000

    def __init__(self, geofence_repo: GeofenceRepository, location_repo: LocationHistoryRepository,
                 route_repo: RouteHistoryRepository) -> None:
        self.geofence_repo = geofence_repo
        self.location_repo = location_repo
        self.route_repo = route_repo

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
        return 2 * 6371000 * math.asin(math.sqrt(a))

    def check_geofence(self, lat: float, lon: float, geofence_lat: float, geofence_lon: float, radius: float) -> dict:
        distance = self.haversine_distance(lat, lon, geofence_lat, geofence_lon)
        return {"inside": distance <= radius, "distance": round(distance, 2)}

    async def create_geofence(self, **kwargs: dict) -> dict:
        gf = await self.geofence_repo.create(**kwargs)
        return {"id": gf.id, "name": gf.name, "radius": gf.radius}

    async def list_geofences(self, company_id: str) -> list[dict]:
        gfs = await self.geofence_repo.list_by_company(company_id)
        return [
            {"id": g.id, "name": g.name, "center_latitude": g.center_latitude, "center_longitude": g.center_longitude,
             "radius": g.radius, "shape": g.shape, "is_active": g.is_active, "color": g.color}
            for g in gfs
        ]

    async def update_geofence(self, geofence_id: str, **kwargs: dict) -> dict:
        gf = await self.geofence_repo.get_by_id(geofence_id)
        if not gf:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geofence not found")
        await self.geofence_repo.update(geofence_id, **kwargs)
        return {"message": "Geofence updated"}

    async def record_location(self, employee_id: str, latitude: float, longitude: float,
                               accuracy: float | None = None, altitude: float | None = None,
                               speed: float | None = None, heading: float | None = None,
                               address: str | None = None, battery_level: int | None = None,
                               connection_type: str | None = None) -> dict:
        from datetime import datetime, timezone
        loc = await self.location_repo.create(
            employee_id=employee_id, latitude=latitude, longitude=longitude,
            accuracy=accuracy, altitude=altitude, speed=speed, heading=heading,
            address=address, battery_level=battery_level, connection_type=connection_type,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        return {"id": loc.id, "timestamp": loc.timestamp}

    async def get_employee_location(self, employee_id: str) -> dict:
        loc = await self.location_repo.get_latest_by_employee(employee_id)
        if not loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No location data found")
        return {
            "latitude": loc.latitude, "longitude": loc.longitude, "accuracy": loc.accuracy,
            "address": loc.address, "timestamp": loc.timestamp, "speed": loc.speed,
        }

    async def get_employee_history(self, employee_id: str, start_date: str | None = None,
                                    end_date: str | None = None) -> list[dict]:
        locs = await self.location_repo.list_by_employee(employee_id, start_date=start_date, end_date=end_date)
        return [
            {"latitude": l.latitude, "longitude": l.longitude, "timestamp": l.timestamp, "address": l.address}
            for l in locs
        ]

    async def get_active_employees_map(self, company_id: str, since_minutes: int = 30) -> dict:
        count = await self.location_repo.count_active_employees(company_id, since_minutes)
        return {"active_count": count, "since_minutes": since_minutes}

    async def calculate_route(self, employee_id: str, date: str) -> dict:
        locs = await self.location_repo.list_by_employee(employee_id, start_date=f"{date}T00:00:00", end_date=f"{date}T23:59:59")
        if len(locs) < 2:
            return {"total_distance_km": 0, "total_time_minutes": 0, "points": len(locs)}
        total_distance = 0.0
        for i in range(1, len(locs)):
            total_distance += self.haversine_distance(
                locs[i - 1].latitude, locs[i - 1].longitude, locs[i].latitude, locs[i].longitude,
            )
        route = await self.route_repo.create(
            employee_id=employee_id, date=date,
            total_distance_km=round(total_distance / 1000, 2),
            start_latitude=locs[-1].latitude, start_longitude=locs[-1].longitude,
            end_latitude=locs[0].latitude, end_longitude=locs[0].longitude,
        )
        return {"id": route.id, "total_distance_km": route.total_distance_km, "points": len(locs)}
