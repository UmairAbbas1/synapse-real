"""SQLAlchemy ORM models defining data sources accurately tracking credentials configurations globally."""

from sqlalchemy import String, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, SoftDeleteMixin

class DataSource(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "data_sources"

    name: Mapped[str] = mapped_column(String, index=True)
    source_type: Mapped[str] = mapped_column(String, index=True)
    config: Mapped[dict] = mapped_column(JSON, default={})
    default_permission_tags: Mapped[list[str]] = mapped_column(JSON, default=[])
    status: Mapped[str] = mapped_column(String, default="active", index=True) # active, paused, error
    created_by: Mapped[str] = mapped_column(String)
