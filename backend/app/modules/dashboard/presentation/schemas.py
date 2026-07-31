from pydantic import BaseModel


class DashboardResponse(BaseModel):
    company_id: str
    employees: dict
    hours: dict
    financial: dict
    productivity: dict


class ActivityItem(BaseModel):
    id: str
    employee_id: str
    record_type: str
    timestamp: str
    latitude: float
    longitude: float
    face_verified: bool
    inside_geofence: bool
