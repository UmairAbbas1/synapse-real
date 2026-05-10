"""Admin role management."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_auth_service, get_current_user
from app.core.auth import AuthService
from app.db.postgres import get_db_session as get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUser


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    permission_tags: list[str]


class UpdateRolePermissionsRequest(BaseModel):
    permission_tags: list[str]


router = APIRouter()


def _require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> list[RoleOut]:
    res = await db.execute(select(Role).order_by(Role.name))
    roles = res.scalars().all()
    return [
        RoleOut(
            id=str(r.id),
            name=r.name,
            description=r.description,
            permission_tags=list(r.permissions or []),
        )
        for r in roles
    ]


@router.patch("/roles/{role_id}/permissions", response_model=RoleOut)
async def patch_role_permissions(
    role_id: str,
    body: UpdateRolePermissionsRequest,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
    auth: AuthService = Depends(get_auth_service),
) -> RoleOut:
    role = await db.get(Role, uuid.UUID(role_id))
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.permissions = body.permission_tags
    await db.commit()
    await db.refresh(role)

    res = await db.execute(select(User.id).where(User.role_id == role.id))
    for uid in res.scalars().all():
        await auth.revoke_all_sessions_for_user(str(uid))

    return RoleOut(
        id=str(role.id),
        name=role.name,
        description=role.description,
        permission_tags=list(role.permissions or []),
    )
