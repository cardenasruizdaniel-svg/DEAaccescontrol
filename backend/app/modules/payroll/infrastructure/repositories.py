from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.models_payroll import PayrollConcept, PayrollPeriod, PayrollRecord


class PayrollPeriodRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, period_id: str) -> PayrollPeriod | None:
        result = await self.db.execute(
            select(PayrollPeriod).where(PayrollPeriod.id == period_id, PayrollPeriod.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_active(self, company_id: str) -> PayrollPeriod | None:
        result = await self.db.execute(
            select(PayrollPeriod).where(
                PayrollPeriod.company_id == company_id,
                PayrollPeriod.status == "open",
                PayrollPeriod.is_deleted == False,
            ).order_by(PayrollPeriod.created_at.desc())
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> PayrollPeriod:
        from datetime import date
        for field in ("start_date", "end_date", "payment_date"):
            if field in kwargs and isinstance(kwargs[field], str):
                kwargs[field] = date.fromisoformat(kwargs[field])
        period = PayrollPeriod(**kwargs)
        self.db.add(period)
        await self.db.flush()
        return period

    async def update(self, period_id: str, **kwargs: dict) -> PayrollPeriod | None:
        await self.db.execute(
            update(PayrollPeriod).where(PayrollPeriod.id == period_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(period_id)

    async def list_by_company(self, company_id: str, skip: int = 0, limit: int = 25) -> tuple[list[PayrollPeriod], int]:
        query = select(PayrollPeriod).where(PayrollPeriod.company_id == company_id, PayrollPeriod.is_deleted == False)
        count_q = select(func.count(PayrollPeriod.id)).where(PayrollPeriod.company_id == company_id, PayrollPeriod.is_deleted == False)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(PayrollPeriod.created_at.desc()))
        return list(result.scalars().all()), total


class PayrollRecordRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, record_id: str) -> PayrollRecord | None:
        result = await self.db.execute(
            select(PayrollRecord).where(PayrollRecord.id == record_id, PayrollRecord.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> PayrollRecord:
        record = PayrollRecord(**kwargs)
        self.db.add(record)
        await self.db.flush()
        return record

    async def update(self, record_id: str, **kwargs: dict) -> None:
        await self.db.execute(
            update(PayrollRecord).where(PayrollRecord.id == record_id).values(**kwargs)
        )
        await self.db.flush()

    async def list_by_period(self, period_id: str, skip: int = 0, limit: int = 100) -> list[PayrollRecord]:
        result = await self.db.execute(
            select(PayrollRecord).where(
                PayrollRecord.period_id == period_id,
                PayrollRecord.is_deleted == False,
            ).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_employee_period(self, employee_id: str, period_id: str) -> PayrollRecord | None:
        result = await self.db.execute(
            select(PayrollRecord).where(
                PayrollRecord.employee_id == employee_id,
                PayrollRecord.period_id == period_id,
                PayrollRecord.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def sum_field_by_period(self, period_id: str, field: str) -> float:
        col = getattr(PayrollRecord, field, None)
        if col is None:
            return 0.0
        result = await self.db.execute(
            select(func.sum(col)).where(PayrollRecord.period_id == period_id, PayrollRecord.is_deleted == False)
        )
        return result.scalar() or 0.0


class PayrollConceptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_company(self, company_id: str) -> list[PayrollConcept]:
        result = await self.db.execute(
            select(PayrollConcept).where(
                PayrollConcept.company_id == company_id,
                PayrollConcept.is_active == True,
                PayrollConcept.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def create(self, **kwargs: dict) -> PayrollConcept:
        concept = PayrollConcept(**kwargs)
        self.db.add(concept)
        await self.db.flush()
        return concept
