from io import BytesIO
from fastapi import HTTPException, status
from app.modules.reports.infrastructure.repositories import ReportRepository


class ReportService:
    def __init__(self, repo: ReportRepository) -> None:
        self.repo = repo

    async def generate_payroll_report(self, company_id: str, period_id: str) -> dict:
        records = await self.repo.get_payroll_report(company_id, period_id)
        if not records:
            return {"message": "No records found", "data": [], "summary": {}}
        total_earnings = sum(float(r.total_earnings) for r in records)
        total_deductions = sum(float(r.total_deductions) for r in records)
        total_net = sum(float(r.net_pay) for r in records)
        return {
            "data": [
                {
                    "employee_id": r.employee_id, "base_salary": float(r.base_salary),
                    "overtime_value": float(r.overtime_value), "bonuses": float(r.bonuses),
                    "total_earnings": float(r.total_earnings),
                    "total_deductions": float(r.total_deductions),
                    "net_pay": float(r.net_pay), "status": r.status,
                }
                for r in records
            ],
            "summary": {
                "total_records": len(records),
                "total_earnings": round(total_earnings, 2),
                "total_deductions": round(total_deductions, 2),
                "total_net_pay": round(total_net, 2),
                "average_net_pay": round(total_net / len(records), 2) if records else 0,
            },
        }

    async def generate_attendance_report(self, employee_id: str, start_date: str, end_date: str) -> dict:
        records = await self.repo.get_attendance_report(employee_id, start_date, end_date)
        entries = [r for r in records if r.record_type == "entry"]
        exits = [r for r in records if r.record_type == "exit"]
        total_hours = sum(float(r.worked_hours or 0) for r in exits)
        return {
            "employee_id": employee_id,
            "period": {"start": start_date, "end": end_date},
            "total_entries": len(entries),
            "total_exits": len(exits),
            "total_hours": round(total_hours, 2),
            "records": [
                {"type": r.record_type, "timestamp": r.timestamp, "worked_hours": r.worked_hours}
                for r in records
            ],
        }

    async def generate_employees_report(self, company_id: str, status: str | None = None) -> dict:
        employees = await self.repo.get_employees_report(company_id, status)
        return {
            "data": [
                {
                    "id": e.id, "code": e.code, "document_number": e.document_number,
                    "first_name": e.first_name, "last_name": e.last_name,
                    "email": e.email, "status": e.status, "department_id": e.department_id,
                }
                for e in employees
            ],
            "total": len(employees),
        }

    async def generate_productivity_report(self, company_id: str, start_date: str, end_date: str) -> dict:
        return await self.repo.get_productivity_report(company_id, start_date, end_date)

    async def export_excel(self, report_data: list[dict], sheet_name: str = "Report") -> bytes:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name
        if report_data:
            headers = list(report_data[0].keys())
            ws.append(headers)
            for row in report_data:
                ws.append([row.get(h, "") for h in headers])
        buffer = BytesIO()
        wb.save(buffer)
        return buffer.getvalue()
