"""Admin user management."""

from __future__ import annotations

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_auth_service, get_current_user
from app.core.auth import AuthService, hash_password
from app.db.postgres import get_db_session as get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import CurrentUser, _normalize_email
from app.schemas.common import PageResponse

logger = structlog.get_logger(__name__)

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    display_name: str
    role_name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UpdateUserRequest(BaseModel):
    display_name: str | None = None
    role_name: str | None = None
    is_active: bool | None = None


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime


def _split_display(name: str) -> tuple[str, str]:
    parts = name.strip().split(" ", 1)
    return parts[0], (parts[1] if len(parts) > 1 else "")


def _require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


@router.get("", response_model=PageResponse[UserAdminResponse])
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    role: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(_require_admin),
) -> PageResponse[UserAdminResponse]:
    stmt = select(User).where(User.is_deleted == False)  # noqa: E712
    if q:
        stmt = stmt.where(or_(User.email.ilike(f"%{q}%"), User.first_name.ilike(f"%{q}%")))
    if role:
        stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role)

    count_q = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int((await db.execute(count_q)).scalar_one())

    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().unique().all()

    items: list[UserAdminResponse] = []
    for u in rows:
        await db.refresh(u, attribute_names=["role"])
        items.append(
            UserAdminResponse(
                id=str(u.id),
                email=u.email,
                display_name=f"{u.first_name} {u.last_name}".strip(),
                role=u.role.name if u.role else "USER",
                is_active=u.is_active,
                created_at=u.created_at,
            )
        )
    return PageResponse(items=items, total=total, page=page, size=size)


@router.post("", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(_require_admin),
) -> UserAdminResponse:
    role_row = (await db.execute(select(Role).where(Role.name == body.role_name))).scalar_one_or_none()
    if not role_row:
        raise HTTPException(status_code=400, detail="Unknown role")
    first, last = _split_display(body.display_name)
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role_id=role_row.id,
        first_name=first,
        last_name=last,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user, attribute_names=["role"])
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        display_name=f"{user.first_name} {user.last_name}".strip(),
        role=user.role.name if user.role else "USER",
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.patch("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(_require_admin),
    auth: AuthService = Depends(get_auth_service),
) -> UserAdminResponse:
    if admin.id == user_id and body.role_name is not None:
        raise HTTPException(status_code=400, detail="Cannot change own role")

    user = await db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    if body.display_name is not None:
        given, family = _split_display(body.display_name)
        user.first_name = given
        user.last_name = family
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role_name is not None:
        role_row = (await db.execute(select(Role).where(Role.name == body.role_name))).scalar_one_or_none()
        if not role_row:
            raise HTTPException(status_code=400, detail="Unknown role")
        user.role_id = role_row.id
        await auth.revoke_all_sessions_for_user(user_id)

    await db.commit()
    await db.refresh(user, attribute_names=["role"])
    return UserAdminResponse(
        id=str(user.id),
        email=user.email,
        display_name=f"{user.first_name} {user.last_name}".strip(),
        role=user.role.name if user.role else "USER",
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(_require_admin),
    auth: AuthService = Depends(get_auth_service),
) -> None:
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete self")

    user = await db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    await db.refresh(user, attribute_names=["role"])
    if user.role and user.role.name == "ADMIN":
        cnt = (
            await db.execute(
                select(func.count(User.id))
                .join(Role, User.role_id == Role.id)
                .where(Role.name == "ADMIN", User.is_active == True, User.is_deleted == False)  # noqa: E712
            )
        ).scalar_one()
        if int(cnt) <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete last admin")

    user.is_active = False
    user.soft_delete()
    await db.commit()
    await auth.revoke_all_sessions_for_user(user_id)
