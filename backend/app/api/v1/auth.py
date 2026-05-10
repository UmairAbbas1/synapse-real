"""Authentication routes: login, logout, profile, password change."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_auth_service, get_current_user
from app.core.auth import AuthService, hash_password, InvalidCredentialsError, verify_password
from app.db.postgres import get_db_session as get_db
from app.limiter import limiter
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, CurrentUser, LoginRequest, LoginResponse, UserPublic

router = APIRouter()


def _display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip()


def _user_public(user: User) -> UserPublic:
    role_name = user.role.name if user.role else "USER"
    tags = list(user.role.permissions) if user.role and user.role.permissions else []
    return UserPublic(
        id=str(user.id),
        email=user.email,
        display_name=_display_name(user),
        role=role_name,
        permission_tags=tags,
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/5minutes")
async def login(
    request: Request,
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
    auth: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    """Issue JWT + session row + Redis session key."""
    try:
        user = await auth.authenticate(req.email, req.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token, _sid = await auth.create_session(user)
    await db.refresh(user)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=28800,
        user=_user_public(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    user: CurrentUser = Depends(get_current_user),
    auth: AuthService = Depends(get_auth_service),
) -> None:
    await auth.revoke_session(user.session_id)


@router.get("/me", response_model=UserPublic)
async def me(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    row = await db.get(User, uuid.UUID(user.id))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    await db.refresh(row, attribute_names=["role"])
    return _user_public(row)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    auth: AuthService = Depends(get_auth_service),
) -> None:
    row = await db.get(User, uuid.UUID(user.id))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(body.old_password, row.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    row.password_hash = hash_password(body.new_password)
    await db.commit()
    await auth.revoke_all_sessions_for_user(user.id)
