from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database.models_base import BaseModel


class Geofence(BaseModel):
    __tablename__ = "geofences"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius: Mapped[float] = mapped_column(Float, nullable=False)
    polygon: Mapped[str | None] = mapped_column(Text, nullable=True)
    shape: Mapped[str] = mapped_column(String(20), default="circle", nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    alert_on_exit: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    alert_on_entry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class LocationHistory(BaseModel):
    __tablename__ = "location_history"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    heading: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    connection_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timestamp: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RouteHistory(BaseModel):
    __tablename__ = "route_history"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    total_distance_km: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    total_time_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    start_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    end_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    end_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    route_polyline: Mapped[str | None] = mapped_column(Text, nullable=True)
    waypoints_json: Mapped[str | None] = mapped_column(Text, nullable=True)
