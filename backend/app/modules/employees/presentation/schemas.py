from pydantic import BaseModel, model_validator


def _clean_optional_strings(values: dict) -> dict:
    """Convert empty strings to None for optional fields."""
    for k, v in values.items():
        if isinstance(v, str) and v == "":
            values[k] = None
    return values


class EmployeeCreateRequest(BaseModel):
    company_id: str
    branch_id: str | None = None
    department_id: str | None = None
    job_position_id: str | None = None
    cost_center_id: str | None = None
    work_team_id: str | None = None
    code: str
    document_type: str
    document_number: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    second_last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    address: str | None = None
    city: str | None = None
    department_loc: str | None = None
    country: str = "CO"
    birth_date: str | None = None
    gender: str | None = None
    blood_type: str | None = None
    marital_status: str | None = None
    eps: str | None = None
    arl: str | None = None
    afp: str | None = None
    caja_compensacion: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    bank_name: str | None = None
    bank_account_type: str | None = None
    bank_account_number: str | None = None
    hire_date: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class EmployeeUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    second_last_name: str | None = None
    branch_id: str | None = None
    department_id: str | None = None
    job_position_id: str | None = None
    cost_center_id: str | None = None
    work_team_id: str | None = None
    email: str | None = None
    phone: str | None = None
    mobile: str | None = None
    address: str | None = None
    city: str | None = None
    status: str | None = None
    birth_date: str | None = None
    gender: str | None = None
    blood_type: str | None = None
    marital_status: str | None = None
    eps: str | None = None
    arl: str | None = None
    afp: str | None = None
    caja_compensacion: str | None = None
    photo_url: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    bank_name: str | None = None
    bank_account_type: str | None = None
    bank_account_number: str | None = None
    platform_access: str | None = None
    account_status: str | None = None
    hire_date: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_empty_strings(cls, data: dict) -> dict:
        return _clean_optional_strings(data)


class EmployeeResponse(BaseModel):
    id: str
    code: str
    document_type: str
    document_number: str
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    status: str
    photo_url: str | None = None


class EmployeeListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
