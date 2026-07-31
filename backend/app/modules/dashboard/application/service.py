from fastapi import HTTPException, status
from app.modules.dashboard.infrastructure.repositories import DashboardRepository


class DashboardService:
    def __init__(self, repo: DashboardRepository) -> None:
        self.repo = repo

    async def get_executive_dashboard(self, company_id: str) -> dict:
        total_employees = await self.repo.count_employees_by_company(company_id, "active")
        active_today = await self.repo.count_active_today(company_id)
        late_today = await self.repo.count_late_today(company_id)
        total_hours = await self.repo.get_total_hours_today()
        total_overtime = await self.repo.get_total_overtime_today()
        payroll_cost = await self.repo.get_payroll_cost_current_month(company_id)
        productivity = await self.repo.get_productivity_metrics(company_id)

        return {
            "company_id": company_id,
            "employees": {
                "total_active": total_employees,
                "active_today": active_today,
                "absent_today": total_employees - active_today,
                "late_today": late_today,
                "on_time_today": active_today - late_today,
            },
            "hours": {
                "total_worked": round(total_hours, 2),
                "total_overtime": round(total_overtime, 2),
                "average_per_employee": round(total_hours / active_today, 2) if active_today > 0 else 0,
            },
            "financial": {
                "current_month_cost": round(payroll_cost, 2),
                "cost_per_employee": round(payroll_cost / total_employees, 2) if total_employees > 0 else 0,
            },
            "productivity": productivity,
        }

    async def get_employee_status_map(self, company_id: str) -> dict:
        total = await self.repo.count_employees_by_company(company_id, "active")
        active = await self.repo.count_active_today(company_id)
        return {
            "total": total, "working": active,
            "absent": total - active, "remote": 0, "on_leave": 0,
        }

    async def get_recent_activity(self, limit: int = 10) -> list[dict]:
        records = await self.repo.get_recent_access_records(limit)
        return [
            {
                "id": r.id, "employee_id": r.employee_id, "record_type": r.record_type,
                "timestamp": r.timestamp, "latitude": r.latitude, "longitude": r.longitude,
                "face_verified": r.face_verified, "inside_geofence": r.inside_geofence,
            }
            for r in records
        ]

    async def get_hourly_trend(self, company_id: str) -> list[dict]:
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        hours = []
        for h in range(6, 22):
            hours.append({
                "hour": f"{h:02d}:00",
                "entries": 0,
                "exits": 0,
                "active_workers": 0,
            })
        return hours
