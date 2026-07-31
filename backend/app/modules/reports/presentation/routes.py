from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentUser, DbSession
from app.modules.reports.application.service import ReportService
from app.modules.reports.infrastructure.repositories import ReportRepository
from app.modules.reports.presentation.schemas import (
    AttendanceReportRequest,
    ProductivityReportRequest,
    ReportRequest,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


def get_service(db: DbSession) -> ReportService:
    return ReportService(repo=ReportRepository(db))


@router.post("/generate")
async def generate_report(body: ReportRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    if body.report_type == "payroll":
        return await service.generate_payroll_report(body.company_id, body.period_id or "")
    elif body.report_type == "employees":
        return await service.generate_employees_report(body.company_id)
    elif body.report_type == "attendance" and body.employee_id:
        return await service.generate_attendance_report(body.employee_id, body.start_date or "", body.end_date or "")
    elif body.report_type == "productivity":
        return await service.generate_productivity_report(body.company_id, body.start_date or "", body.end_date or "")
    else:
        return {"message": "Invalid report type or missing parameters"}


@router.post("/attendance")
async def attendance_report(body: AttendanceReportRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).generate_attendance_report(body.employee_id, body.start_date, body.end_date)


@router.post("/productivity")
async def productivity_report(body: ProductivityReportRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).generate_productivity_report(body.company_id, body.start_date, body.end_date)


@router.post("/export/excel")
async def export_excel(body: ReportRequest, current_user: CurrentUser, db: DbSession) -> StreamingResponse:
    service = get_service(db)
    report = await service.generate_payroll_report(body.company_id, body.period_id or "")
    data = report.get("data", [])
    excel_bytes = await service.export_excel(data, "Payroll Report")
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=payroll_report.xlsx"},
    )
