from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.ai_assistant.application.service import AIAssistantService
from app.modules.ai_assistant.infrastructure.repositories import AIRepository
from app.modules.ai_assistant.presentation.schemas import AIQueryRequest

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


def get_service(db: DbSession) -> AIAssistantService:
    return AIAssistantService(repo=AIRepository(db))


@router.post("/query")
async def ai_query(body: AIQueryRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).process_query(body.company_id, body.query)


@router.get("/insights/{company_id}")
async def get_insights(company_id: str, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).get_insights(company_id)


@router.post("/search-employees")
async def search_employees(body: AIQueryRequest, current_user: CurrentUser, db: DbSession) -> dict:
    service = get_service(db)
    employees = await service.repo.search_employees(body.company_id, body.query)
    return {
        "results": [
            {"id": e.id, "code": e.code, "name": f"{e.first_name} {e.last_name}", "email": e.email, "status": e.status}
            for e in employees
        ],
        "total": len(employees),
    }
