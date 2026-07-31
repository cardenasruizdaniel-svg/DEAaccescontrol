from sqlalchemy import Boolean, ForeignKey, String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.database.models_base import BaseModel
from datetime import datetime


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    company_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("companies.id"), nullable=True, index=True)
    employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="system", server_default="system")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_json: Mapped[str | None] = mapped_column("data", JSON, nullable=True)


class PushToken(BaseModel):
    __tablename__ = "push_tokens"

    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), default="expo", server_default="expo")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
