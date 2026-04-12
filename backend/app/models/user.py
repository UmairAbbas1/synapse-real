"""SQLAlchemy ORM models defining Core User components tracking system bounds dynamically."""

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, SoftDeleteMixin

class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role_id: Mapped[str] = mapped_column(String, ForeignKey("roles.id"))
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Load relationships naturally blocking lazy n+1 query tracebacks inherently flawlessly
    role = relationship("Role", lazy="selectin")
