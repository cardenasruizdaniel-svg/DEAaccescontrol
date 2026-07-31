from pydantic import BaseModel


class ContractCreateRequest(BaseModel):
    employee_id: str
    company_id: str
    contract_type_id: str
    branch_id: str | None = None
    department_id: str | None = None
    job_position_id: str | None = None
    cost_center_id: str | None = None
    code: str
    start_date: str
    end_date: str | None = None
    salary: float
    transportation_assistance: bool = True
    weekly_hours: float = 48.0
    daily_hours: float = 8.0
    work_scheme: str = "full_time"
    payment_frequency: str = "monthly"
    health_provider: str | None = None
    pension_provider: str | None = None
    arl_provider: str | None = None
    risk_level: str = "1"
    notes: str | None = None


class ContractUpdateRequest(BaseModel):
    employee_id: str | None = None
    contract_type_id: str | None = None
    code: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    salary: float | None = None
    transportation_assistance: bool | None = None
    weekly_hours: float | None = None
    daily_hours: float | None = None
    work_scheme: str | None = None
    payment_frequency: str | None = None
    health_provider: str | None = None
    pension_provider: str | None = None
    arl_provider: str | None = None
    risk_level: str | None = None
    notes: str | None = None
    status: str | None = None


class ContractTerminateRequest(BaseModel):
    reason: str


class ContractListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
