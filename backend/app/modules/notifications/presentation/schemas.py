from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    type: str
    is_read: bool
    data_json: str | None = None
    created_at: str


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class PushTokenRequest(BaseModel):
    token: str
    platform: str = "android"
