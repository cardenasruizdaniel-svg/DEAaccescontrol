from pydantic import BaseModel


class EntryRequest(BaseModel):
    employee_id: str
    latitude: float
    longitude: float
    photo_base64: str | None = None
    device_id: str | None = None
    device_model: str | None = None
    device_os: str | None = None
    battery_level: int | None = None
    connection_type: str | None = None
    is_mock_location: bool = False
    shift_id: str | None = None
    client_id: str | None = None
    geofence_lat: float | None = None
    geofence_lon: float | None = None
    geofence_radius: float | None = None
    offline_timestamp: str | None = None


class ExitRequest(BaseModel):
    employee_id: str
    latitude: float
    longitude: float
    photo_base64: str | None = None
    observations: str | None = None
    device_id: str | None = None
    connection_type: str | None = None
    offline_timestamp: str | None = None


class AccessRecordResponse(BaseModel):
    id: str
    record_type: str
    timestamp: str
    inside_geofence: bool
    face_verified: bool
    worked_hours: float | None = None
    warnings: list[str] = []
