from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit records tracking system access securely."""
    __tablename__ = "audit_logs"

    user_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String, index=True)
    resource_type: Mapped[str] = mapped_column(String)
    details: Mapped[dict] = mapped_column(JSON)
    query_hash: Mapped[str | None] = mapped_column(String, nullable=True)
