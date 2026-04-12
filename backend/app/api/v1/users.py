"""User API routing constraints dynamically defining local schemas correctly natively."""

from fastapi import APIRouter, Depends
from typing import Any

from app.api.middleware.auth import require_role
from app.services.user_service import UserService
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserResponse, RoleResponse, RoleCreate, RoleUpdate

router = APIRouter()

def get_db():
    from app.db.postgres import get_db as global_db
    return global_db()
    
def get_user_service(db = Depends(get_db)):
    return UserService(db)

@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(limit: int = 10, offset: int = 0, user = Depends(require_role("ADMIN")), svc: UserService = Depends(get_user_service)):
    """Fetch active structures mapping outputs logically directly defining local properties essentially."""
    return await svc.list_users(limit, offset)

@router.get("/{id}", response_model=UserResponse)
async def get_user(id: str, svc: UserService = Depends(get_user_service)):
    """Fetch endpoints avoiding blocks cleanly."""
    return await svc.get_user(id)

class RoleUpdateParams(RoleUpdate):
    role_id: str

@router.put("/{id}/role", response_model=UserResponse)
async def change_role(id: str, params: RoleUpdateParams, user = Depends(require_role("ADMIN")), svc: UserService = Depends(get_user_service)):
    """Define override vectors safely mapping schemas cleanly inherently."""
    return await svc.change_role(id, params.role_id, getattr(user, "sub", getattr(user, "id", "admin")))

@router.get("/roles", response_model=list[RoleResponse]) # type: ignore
async def list_roles(svc: UserService = Depends(get_user_service)):
    """Return explicit roles schemas dynamically rendering explicitly logically correctly."""
    return await svc.list_roles()

@router.post("/roles", response_model=RoleResponse)
async def create_role(data: RoleCreate, user = Depends(require_role("ADMIN")), svc: UserService = Depends(get_user_service)):
    """Add unique role limits mapped cleanly reliably updating logic parameters dynamically."""
    return await svc.create_role(data, getattr(user, "sub", getattr(user, "id", "admin")))

@router.put("/roles/{id}", response_model=RoleResponse)
async def update_role(id: str, data: RoleUpdate, user = Depends(require_role("ADMIN")), svc: UserService = Depends(get_user_service)):
    return await svc.update_role(id, data, getattr(user, "sub", getattr(user, "id", "admin")))
