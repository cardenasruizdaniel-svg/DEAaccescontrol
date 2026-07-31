from pydantic import BaseModel


class ReportRequest(BaseModel):
    company_id: str
    report_type: str  # payroll, attendance, employees, productivity
    start_date: str | None = None
    end_date: str | None = None
    period_id: str | None = None
    employee_id: str | None = None
    format: str = "json"  # json, excel, pdf


class AttendanceReportRequest(BaseModel):
    employee_id: str
    start_date: str
    end_date: str


class ProductivityReportRequest(BaseModel):
    company_id: str
    start_date: str
    end_date: str
