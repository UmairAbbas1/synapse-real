"""Auth Endpoints mapping connection structures transparently avoiding bottlenecks natively."""

from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.middleware.error_handler import AuthenticationError
from app.api.deps import get_auth_service, get_current_user as get_current_user_dep
from app.core.auth import AuthService as CoreAuthService, InvalidCredentialsError
from app.config import settings
from app.db.postgres import get_db_session as get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, TokenResponse, UserPublic, LoginResponse

router = APIRouter()

class RefreshRequest(BaseModel):
    refresh_token: str


def _create_refresh_token(user_id: str) -> str:
    import jwt

    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
    auth_svc: CoreAuthService = Depends(get_auth_service),
):
    try:
        user = await auth_svc.authenticate(req.email, req.password)
    except InvalidCredentialsError as exc:
        raise AuthenticationError("Invalid email or password.") from exc

    access_token, session_id = await auth_svc.create_session(user)
    refresh_token = _create_refresh_token(str(user.id))
    await db.execute(
        update(UserSession)
        .where(UserSession.id == uuid.UUID(session_id))
        .values(refresh_token=refresh_token)
    )
    await db.commit()

    role_name = user.role.name if user.role else "USER"
    role_name_lower = role_name.lower()
    permissions = user.role.permissions if user.role else []

    # Build display name from first and last name, or use email
    display_name = f"{user.first_name} {user.last_name}".strip() or user.email.split("@")[0]

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.SESSION_EXPIRE_HOURS * 3600,
        user=UserPublic(
            id=str(user.id),
            email=user.email,
            display_name=display_name,
            role=role_name_lower,
            permission_tags=permissions,
        ),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    auth_svc: CoreAuthService = Depends(get_auth_service),
):
    try:
        import jwt
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type.")
    except Exception:
        raise AuthenticationError("Invalid or expired refresh token.")
        
    res = await db.execute(select(UserSession).where(UserSession.refresh_token == req.refresh_token))
    session = res.scalar_one_or_none()
    
    if not session or getattr(session.expires_at, "replace", lambda tzinfo: session.expires_at)(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise AuthenticationError("Invalid or expired refresh token.")
        
    user_res = await db.execute(select(User).where(User.id == session.user_id))
    user = user_res.scalar_one()
    
    access_token, _session_id = await auth_svc.create_session(user)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.SESSION_EXPIRE_HOURS * 3600,
        refresh_token=req.refresh_token
    )

@router.post("/logout", status_code=204)
async def logout(
    user: CurrentUser = Depends(get_current_user_dep),
    auth_svc: CoreAuthService = Depends(get_auth_service),
    db: AsyncSession = Depends(get_db),
):
    await auth_svc.revoke_session(user.session_id)
    await db.execute(delete(UserSession).where(UserSession.id == uuid.UUID(user.session_id)))
    await db.commit()

@router.get("/me", response_model=UserPublic)
async def get_current_user(
    current_user: CurrentUser = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """Get current user info from JWT token."""
    res = await db.execute(select(User).where(User.id == current_user.id))
    user = res.scalar_one_or_none()

    if not user:
        raise AuthenticationError("User not found.")

    role_name = current_user.role.lower()
    display_name = f"{user.first_name} {user.last_name}".strip() or user.email.split("@")[0]

    return UserPublic(
        id=str(user.id),
        email=user.email,
        display_name=display_name,
        role=role_name,
        permission_tags=current_user.permission_tags,
    )
