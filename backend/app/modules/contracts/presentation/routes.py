from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.contracts.application.service import ContractService
from app.modules.contracts.infrastructure.repositories import (
    ContractRepository,
    ContractTypeRepository,
)
from app.modules.contracts.presentation.schemas import (
    ContractCreateRequest,
    ContractListResponse,
    ContractTerminateRequest,
    ContractUpdateRequest,
)

router = APIRouter(prefix="/contracts", tags=["Contracts"])


def get_service(db: DbSession) -> ContractService:
    return ContractService(
        contract_repo=ContractRepository(db),
        type_repo=ContractTypeRepository(db),
    )


@router.post("", status_code=201)
async def create_contract(body: ContractCreateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.create_contract(**body.model_dump())


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    current_user: CurrentUser, db: DbSession,
    company_id: str | None = Query(None),
    employee_id: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> ContractListResponse:
    service = get_service(db)
    result = await service.list_contracts(
        company_id=company_id, employee_id=employee_id,
        status=status, page=page, page_size=page_size,
    )
    return ContractListResponse(**result.__dict__)


@router.get("/types")
async def list_contract_types(company_id: str, current_user: CurrentUser, db: DbSession) -> list[dict]:
    service = get_service(db)
    return await service.list_contract_types(company_id)


@router.get("/{contract_id}")
async def get_contract(contract_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    c = await service.get_contract(contract_id)
    employee_name = f"{c.employee.first_name} {c.employee.last_name}" if c.employee else c.employee_id
    return {
        "id": c.id, "code": c.code, "employee_id": c.employee_id,
        "employee_name": employee_name,
        "contract_type_id": c.contract_type_id, "start_date": str(c.start_date),
        "end_date": str(c.end_date) if c.end_date else None,
        "salary": float(c.salary), "status": c.status,
        "work_scheme": c.work_scheme, "weekly_hours": c.weekly_hours,
        "daily_hours": c.daily_hours, "notes": c.notes,
        "transportation_assistance": c.transportation_assistance,
        "payment_frequency": c.payment_frequency,
        "health_provider": c.health_provider, "pension_provider": c.pension_provider,
        "arl_provider": c.arl_provider, "risk_level": c.risk_level,
    }


@router.put("/{contract_id}")
async def update_contract(contract_id: str, body: ContractUpdateRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    return await service.update_contract(contract_id, **body.model_dump(exclude_unset=True))


@router.post("/{contract_id}/terminate")
async def terminate_contract(
    contract_id: str, body: ContractTerminateRequest,
    current_user: CurrentUser, db: DbSession,
) -> dict:
    service = get_service(db)
    return await service.terminate_contract(contract_id, body.reason)
