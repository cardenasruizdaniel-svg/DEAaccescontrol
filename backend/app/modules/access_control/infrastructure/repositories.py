from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.models_access import AccessRecord


class AccessRecordRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs: dict) -> AccessRecord:
        record = AccessRecord(**kwargs)
        self.db.add(record)
        await self.db.flush()
        return record

    async def get_by_id(self, record_id: str) -> AccessRecord | None:
        result = await self.db.execute(select(AccessRecord).where(AccessRecord.id == record_id, AccessRecord.is_deleted == False))
        return result.scalar_one_or_none()

    async def get_last_by_employee(self, employee_id: str, record_type: str | None = None) -> AccessRecord | None:
        query = select(AccessRecord).where(AccessRecord.employee_id == employee_id, AccessRecord.is_deleted == False)
        if record_type:
            query = query.where(AccessRecord.record_type == record_type)
        result = await self.db.execute(query.order_by(AccessRecord.created_at.desc()).limit(1))
        return result.scalar_one_or_none()

    async def list_by_employee(self, employee_id: str, start_date: str | None = None, end_date: str | None = None, limit: int = 100) -> list[AccessRecord]:
        query = select(AccessRecord).where(AccessRecord.employee_id == employee_id, AccessRecord.is_deleted == False)
        if start_date:
            query = query.where(AccessRecord.timestamp >= start_date)
        if end_date:
            query = query.where(AccessRecord.timestamp <= end_date)
        result = await self.db.execute(query.order_by(AccessRecord.timestamp.desc()).limit(limit))
        return list(result.scalars().all())

    async def list_by_date(self, company_id: str, record_date: str) -> list[AccessRecord]:
        result = await self.db.execute(
            select(AccessRecord).where(
                AccessRecord.client_id.isnot(None),
                AccessRecord.timestamp.like(f"{record_date}%"),
                AccessRecord.is_deleted == False,
            ).order_by(AccessRecord.timestamp.desc())
        )
        return list(result.scalars().all())

    async def count_by_type_date(self, record_type: str, record_date: str) -> int:
        result = await self.db.execute(
            select(func.count(AccessRecord.id)).where(
                AccessRecord.record_type == record_type,
                AccessRecord.timestamp.like(f"{record_date}%"),
                AccessRecord.is_deleted == False,
            )
        )
        return result.scalar() or 0

    async def get_attendance_summary(self, company_id: str, record_date: str) -> dict:
        entries = await self.count_by_type_date("entry", record_date)
        exits = await self.count_by_type_date("exit", record_date)
        return {"date": record_date, "total_entries": entries, "total_exits": exits}

    async def list_records_with_filters(
        self, company_id: str | None = None, employee_id: str | None = None,
        record_type: str | None = None, start_date: str | None = None,
        end_date: str | None = None, skip: int = 0, limit: int = 25,
    ) -> tuple[list[AccessRecord], int]:
        query = select(AccessRecord).where(AccessRecord.is_deleted == False)
        count_q = select(func.count(AccessRecord.id)).where(AccessRecord.is_deleted == False)
        if employee_id:
            query = query.where(AccessRecord.employee_id == employee_id)
            count_q = count_q.where(AccessRecord.employee_id == employee_id)
        if record_type:
            query = query.where(AccessRecord.record_type == record_type)
            count_q = count_q.where(AccessRecord.record_type == record_type)
        if start_date:
            query = query.where(AccessRecord.timestamp >= start_date)
            count_q = count_q.where(AccessRecord.timestamp >= start_date)
        if end_date:
            query = query.where(AccessRecord.timestamp <= end_date)
            count_q = count_q.where(AccessRecord.timestamp <= end_date)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(AccessRecord.timestamp.desc()))
        return list(result.scalars().all()), total
