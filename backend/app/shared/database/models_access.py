from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database.models_base import BaseModel


class AccessRecord(BaseModel):
    __tablename__ = "access_records"

    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    shift_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id"), nullable=True)
    record_type: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    timestamp: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_os: Mapped[str | None] = mapped_column(String(50), nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    connection_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    selfie_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    face_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    inside_geofence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    geofence_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    geofence_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_mock_location: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    liveness_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    worked_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    overtime_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    night_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    offline_timestamp: Mapped[str | None] = mapped_column(String(30), nullable=True)
    auto_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_late_arrival: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_early_departure: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_auto_exit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    shift: Mapped["Shift | None"] = relationship(back_populates="access_records")
