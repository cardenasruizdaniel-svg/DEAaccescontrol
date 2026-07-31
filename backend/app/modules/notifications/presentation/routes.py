from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.notifications.infrastructure.repositories import (
    NotificationRepository,
    PushTokenRepository,
)
from app.modules.notifications.presentation.schemas import (
    NotificationListResponse,
    NotificationResponse,
    PushTokenRequest,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _repo(db: DbSession) -> NotificationRepository:
    return NotificationRepository(db)


def _push_repo(db: DbSession) -> PushTokenRepository:
    return PushTokenRepository(db)


def _to_response(n) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        title=n.title,
        body=n.body,
        type=n.type,
        is_read=n.is_read,
        data_json=n.data_json,
        created_at=str(n.created_at),
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> NotificationListResponse:
    skip = (page - 1) * page_size
    items, total, unread = await _repo(db).list_by_user(current_user.id, skip=skip, limit=page_size)
    return NotificationListResponse(
        items=[_to_response(n) for n in items],
        total=total,
        unread_count=unread,
    )


@router.post("/register")
async def register_push_token(
    body: PushTokenRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    pt = await _push_repo(db).register(
        user_id=current_user.id,
        token=body.token,
        platform=body.platform,
    )
    return {"message": "Token registered", "id": pt.id}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    await _repo(db).mark_read(notification_id)
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    await _repo(db).mark_all_read(current_user.id)
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
async def unread_count(
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    _, _, unread = await _repo(db).list_by_user(current_user.id, skip=0, limit=0)
    return {"unread_count": unread}
