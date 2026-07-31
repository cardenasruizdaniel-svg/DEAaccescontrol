from pydantic import BaseModel


class GeofenceCreateRequest(BaseModel):
    company_id: str
    name: str
    description: str | None = None
    center_latitude: float
    center_longitude: float
    radius: float
    shape: str = "circle"
    color: str | None = None
    client_id: str | None = None
    alert_on_exit: bool = True
    alert_on_entry: bool = False


class LocationRecordRequest(BaseModel):
    employee_id: str
    latitude: float
    longitude: float
    accuracy: float | None = None
    altitude: float | None = None
    speed: float | None = None
    heading: float | None = None
    address: str | None = None
    battery_level: int | None = None
    connection_type: str | None = None


class GeofenceCheckRequest(BaseModel):
    latitude: float
    longitude: float
    geofence_id: str


class GeofenceResponse(BaseModel):
    id: str
    name: str
    center_latitude: float
    center_longitude: float
    radius: float
    shape: str
    is_active: bool
