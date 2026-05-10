"""Compatibility re-exports for dependencies used by legacy imports."""

from app.api.deps import get_current_user, require_permission, require_role
from app.schemas.auth import CurrentUser

__all__ = ["get_current_user", "require_role", "require_permission", "CurrentUser"]
