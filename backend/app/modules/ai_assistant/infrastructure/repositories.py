from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_access import AccessRecord
from app.shared.database.models_hr import Employee


class AIRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def search_employees(self, company_id: str, query: str) -> list[Employee]:
        q = select(Employee).where(
            Employee.company_id == company_id, Employee.is_deleted == False,
        ).where(
            Employee.first_name.ilike(f"%{query}%")
            | Employee.last_name.ilike(f"%{query}%")
            | Employee.document_number.ilike(f"%{query}%")
            | Employee.code.ilike(f"%{query}%")
        ).limit(20)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_attendance_pattern(self, employee_id: str, days: int = 30) -> dict:
        result = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.employee_id == employee_id,
                AccessRecord.record_type == "entry",
                AccessRecord.is_deleted == False,
            )
        )
        total_entries = result.scalar() or 0
        late_result = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.employee_id == employee_id,
                AccessRecord.record_type == "entry",
                AccessRecord.timestamp.like("%T0[8-9]%"),
                AccessRecord.is_deleted == False,
            )
        )
        late_entries = late_result.scalar() or 0
        return {
            "total_entries": total_entries,
            "late_entries": late_entries,
            "punctuality_rate": round((total_entries - late_entries) / total_entries * 100, 1) if total_entries > 0 else 100,
        }

    async def detect_anomalies(self, company_id: str) -> list[dict]:
        anomalies = []
        employees_result = await self.db.execute(
            select(Employee).where(Employee.company_id == company_id, Employee.status == "active", Employee.is_deleted == False)
        )
        employees = list(employees_result.scalars().all())
        for emp in employees[:50]:
            pattern = await self.get_attendance_pattern(emp.id)
            if pattern["punctuality_rate"] < 70:
                anomalies.append({
                    "employee_id": emp.id, "employee_name": f"{emp.first_name} {emp.last_name}",
                    "type": "frequent_lateness", "severity": "medium",
                    "detail": f"Punctuality rate: {pattern['punctuality_rate']}%",
                })
        return anomalies
