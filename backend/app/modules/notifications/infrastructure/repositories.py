from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.notifications.domain.models import Notification, PushToken


class NotificationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, **kwargs) -> Notification:
        n = Notification(**kwargs)
        self.db.add(n)
        await self.db.flush()
        return n

    async def list_by_user(self, user_id: str, skip: int = 0, limit: int = 25) -> tuple[list[Notification], int, int]:
        base = select(Notification).where(Notification.user_id == user_id, Notification.is_deleted == False)
        count_q = select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.is_deleted == False)
        unread_q = select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.is_deleted == False, Notification.is_read == False)

        total = (await self.db.execute(count_q)).scalar() or 0
        unread = (await self.db.execute(unread_q)).scalar() or 0
        result = await self.db.execute(base.order_by(Notification.created_at.desc()).offset(skip).limit(limit))

        return list(result.scalars().all()), total, unread

    async def mark_read(self, notification_id: str) -> None:
        await self.db.execute(update(Notification).where(Notification.id == notification_id).values(is_read=True))
        await self.db.flush()

    async def mark_all_read(self, user_id: str) -> None:
        await self.db.execute(update(Notification).where(Notification.user_id == user_id, Notification.is_read == False).values(is_read=True))
        await self.db.flush()


class PushTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, user_id: str, token: str, platform: str) -> PushToken:
        existing = (await self.db.execute(select(PushToken).where(PushToken.token == token))).scalar_one_or_none()
        if existing:
            existing.is_active = True
            await self.db.flush()
            return existing

        pt = PushToken(user_id=user_id, token=token, platform=platform)
        self.db.add(pt)
        await self.db.flush()
        return pt

    async def get_active_tokens(self, company_id: str) -> list[str]:
        result = await self.db.execute(
            select(PushToken.token).where(PushToken.is_active == True)
        )
        return [r[0] for r in result.all()]
