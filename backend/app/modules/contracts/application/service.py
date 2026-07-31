from fastapi import HTTPException, status

from app.core.pagination import PaginatedResult
from app.modules.contracts.infrastructure.repositories import (
    ContractRepository,
    ContractTypeRepository,
)


class ContractService:
    def __init__(self, contract_repo: ContractRepository, type_repo: ContractTypeRepository) -> None:
        self.contract_repo = contract_repo
        self.type_repo = type_repo

    async def create_contract(self, **kwargs: dict) -> dict:
        active = await self.contract_repo.get_active_by_employee(kwargs["employee_id"])
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee already has an active contract",
            )
        from datetime import date as _date
        for field in ("start_date", "end_date"):
            if field in kwargs and isinstance(kwargs[field], str):
                kwargs[field] = _date.fromisoformat(kwargs[field])
        contract = await self.contract_repo.create(**kwargs)
        return {"id": contract.id, "code": contract.code, "status": contract.status}

    async def get_contract(self, contract_id: str):
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        return contract

    async def update_contract(self, contract_id: str, **kwargs: dict) -> dict:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        employee_id = kwargs.get("employee_id", contract.employee_id)
        active = await self.contract_repo.get_active_by_employee_except(employee_id, contract_id)
        if active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee already has an active contract")
        from datetime import date as _date
        for field in ("start_date", "end_date"):
            if field in kwargs and isinstance(kwargs[field], str):
                kwargs[field] = _date.fromisoformat(kwargs[field])
        allowed = {"employee_id", "contract_type_id", "code", "start_date", "end_date", "salary",
                    "work_scheme", "weekly_hours", "daily_hours", "notes", "status", "transportation_assistance"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        updated = await self.contract_repo.update(contract_id, **filtered)
        return {"id": updated.id, "code": updated.code, "status": updated.status}

    async def delete_contract(self, contract_id: str) -> None:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        await self.contract_repo.update(contract_id, is_deleted=True)

    async def list_contracts(
        self, company_id: str | None = None, employee_id: str | None = None,
        status: str | None = None, search: str | None = None,
        page: int = 1, page_size: int = 25,
    ) -> PaginatedResult:
        skip = (page - 1) * page_size
        items, total = await self.contract_repo.list_contracts(
            company_id=company_id, employee_id=employee_id,
            status=status, search=search, skip=skip, limit=page_size,
        )
        return PaginatedResult.create(
            items=[
                {
                    "id": c.id, "code": c.code,
                    "employee_id": c.employee_id,
                    "employee_name": f"{c.employee.first_name} {c.employee.last_name}" if c.employee else c.employee_id,
                    "contract_type_id": c.contract_type_id, "start_date": str(c.start_date),
                    "end_date": str(c.end_date) if c.end_date else None,
                    "salary": float(c.salary), "status": c.status,
                    "work_scheme": c.work_scheme, "weekly_hours": c.weekly_hours,
                    "daily_hours": c.daily_hours, "notes": c.notes,
                    "transportation_assistance": c.transportation_assistance,
                }
                for c in items
            ],
            total=total, page=page, page_size=page_size,
        )

    async def terminate_contract(self, contract_id: str, reason: str) -> dict:
        contract = await self.contract_repo.get_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
        if contract.status != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contract is not active")
        await self.contract_repo.terminate(contract_id, reason)
        return {"message": "Contract terminated successfully"}

    async def list_contract_types(self, company_id: str) -> list[dict]:
        types = await self.type_repo.list_by_company(company_id)
        return [{"id": t.id, "code": t.code, "name": t.name, "labor_law_type": t.labor_law_type} for t in types]

