"""SQLAlchemy models routing short-lived system tokens securely."""

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class UserSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "user_sessions"
    
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    refresh_token: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
