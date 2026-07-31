from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.shared.database.models_contract import Contract, ContractType
from app.shared.database.models_hr import Employee


class ContractRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, contract_id: str) -> Contract | None:
        result = await self.db.execute(
            select(Contract).options(selectinload(Contract.employee)).where(Contract.id == contract_id, Contract.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_active_by_employee(self, employee_id: str) -> Contract | None:
        result = await self.db.execute(
            select(Contract).where(
                Contract.employee_id == employee_id,
                Contract.status == "active",
                Contract.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def get_active_by_employee_except(self, employee_id: str, contract_id: str) -> Contract | None:
        result = await self.db.execute(
            select(Contract).where(
                Contract.employee_id == employee_id,
                Contract.status == "active",
                Contract.is_deleted == False,
                Contract.id != contract_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: dict) -> Contract:
        contract = Contract(**kwargs)
        self.db.add(contract)
        await self.db.flush()
        return contract

    async def update(self, contract_id: str, **kwargs: dict) -> Contract | None:
        await self.db.execute(
            update(Contract).where(Contract.id == contract_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(contract_id)

    async def list_contracts(
        self,
        company_id: str | None = None,
        employee_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 25,
    ) -> tuple[list[Contract], int]:
        query = select(Contract).options(selectinload(Contract.employee)).where(Contract.is_deleted == False)
        count_query = select(func.count(Contract.id)).where(Contract.is_deleted == False)

        if company_id:
            query = query.where(Contract.company_id == company_id)
            count_query = count_query.where(Contract.company_id == company_id)
        if employee_id:
            query = query.where(Contract.employee_id == employee_id)
            count_query = count_query.where(Contract.employee_id == employee_id)
        if status:
            query = query.where(Contract.status == status)
            count_query = count_query.where(Contract.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        query = query.offset(skip).limit(limit).order_by(Contract.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().unique().all()), total

    async def terminate(self, contract_id: str, reason: str) -> Contract | None:
        from datetime import date
        return await self.update(
            contract_id,
            status="terminated",
            end_date=date.today(),
            termination_reason=reason,
        )


class ContractTypeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_company(self, company_id: str) -> list[ContractType]:
        result = await self.db.execute(
            select(ContractType).where(
                ContractType.company_id == company_id,
                ContractType.is_deleted == False,
            )
        )
        return list(result.scalars().all())

    async def create(self, **kwargs: dict) -> ContractType:
        ct = ContractType(**kwargs)
        self.db.add(ct)
        await self.db.flush()
        return ct
