from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_access import AccessRecord
from app.shared.database.models_hr import Employee
from app.shared.database.models_payroll import PayrollRecord


class ReportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_payroll_report(self, company_id: str, period_id: str) -> list[PayrollRecord]:
        result = await self.db.execute(
            select(PayrollRecord).where(
                PayrollRecord.company_id == company_id,
                PayrollRecord.period_id == period_id,
                PayrollRecord.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def get_attendance_report(self, employee_id: str, start_date: str, end_date: str) -> list[AccessRecord]:
        result = await self.db.execute(
            select(AccessRecord).where(
                AccessRecord.employee_id == employee_id,
                AccessRecord.timestamp >= start_date,
                AccessRecord.timestamp <= end_date,
                AccessRecord.is_deleted == False,
            ).order_by(AccessRecord.timestamp)
        )
        return list(result.scalars().all())

    async def get_employees_report(self, company_id: str, status: str | None = None) -> list[Employee]:
        query = select(Employee).where(Employee.company_id == company_id, Employee.is_deleted == False)
        if status:
            query = query.where(Employee.status == status)
        result = await self.db.execute(query.order_by(Employee.first_name))
        return list(result.scalars().all())

    async def get_productivity_report(self, company_id: str, start_date: str, end_date: str) -> dict:
        total_records = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.timestamp >= start_date,
                AccessRecord.timestamp <= end_date,
                AccessRecord.is_deleted == False,
            )
        )
        verified = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.timestamp >= start_date,
                AccessRecord.timestamp <= end_date,
                AccessRecord.face_verified == True,
                AccessRecord.is_deleted == False,
            )
        )
        geo_ok = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.timestamp >= start_date,
                AccessRecord.timestamp <= end_date,
                AccessRecord.inside_geofence == True,
                AccessRecord.is_deleted == False,
            )
        )
        total = total_records.scalar() or 0
        ver = verified.scalar() or 0
        geo = geo_ok.scalar() or 0
        return {
            "period": {"start": start_date, "end": end_date},
            "total_records": total,
            "face_verified_count": ver,
            "inside_geofence_count": geo,
            "face_verification_rate": round(ver / total * 100, 1) if total > 0 else 0,
            "geofence_compliance_rate": round(geo / total * 100, 1) if total > 0 else 0,
        }
