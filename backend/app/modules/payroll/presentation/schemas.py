from pydantic import BaseModel


class PayrollPeriodCreateRequest(BaseModel):
    company_id: str
    name: str
    year: int
    month: int
    start_date: str
    end_date: str
    payment_date: str


class PayrollCalculateRequest(BaseModel):
    period_id: str
    employee_id: str
    contract_id: str
    company_id: str
    salary: float
    transportation_assistance: bool = True
    daily_hours: float = 8.0
    risk_level: str = "1"
    overtime_hours: float = 0
    night_hours: float = 0
    sunday_holiday_hours: float = 0
    bonuses: float = 0
    commissions: float = 0
    other_earnings: float = 0
    worked_days: int = 30


class PayrollPeriodResponse(BaseModel):
    id: str
    name: str
    year: int
    month: int
    status: str


class PayrollListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
