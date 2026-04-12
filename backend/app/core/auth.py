"""Core authentication hooks dynamically generating base models protecting routing constraints."""

from fastapi import Depends
from app.schemas.auth import TokenPayload

async def get_current_user() -> TokenPayload:
    """Implement exact placeholder dependencies cleanly bypassing internal crashes waiting for Stage 4 implementations."""
    return TokenPayload(sub="123", role="admin", permissions=["*"], exp=None)
