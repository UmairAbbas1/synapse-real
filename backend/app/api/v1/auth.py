"""Auth Endpoints mapping connection structures transparently avoiding bottlenecks natively."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.middleware.error_handler import AuthenticationError
from app.db.postgres import get_db_session as get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


def get_auth_service() -> AuthService:
    return AuthService()

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db), auth_svc: AuthService = Depends(get_auth_service)):
    res = await db.execute(select(User).where(User.email == req.email))
    user = res.scalar_one_or_none()
    
    if not user or not auth_svc.verify_password(req.password, user.password_hash):
        raise AuthenticationError("Invalid email or password.")
        
    if not user.is_active:
        raise AuthenticationError("Account is inactive.")
        
    role_name = user.role.name if user.role else "USER"
    permissions = user.role.permissions if user.role else []
    
    access_token = auth_svc.create_access_token(str(user.id), role_name, permissions)
    refresh_token = auth_svc.create_refresh_token(str(user.id))
    
    from app.config import settings
    
    session = UserSession(
        user_id=str(user.id),
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(session)
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.SESSION_EXPIRE_HOURS * 3600,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db), auth_svc: AuthService = Depends(get_auth_service)):
    try:
        from app.config import settings
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
    
    role_name = user.role.name if user.role else "USER"
    permissions = user.role.permissions if user.role else []
    
    access_token = auth_svc.create_access_token(str(user.id), role_name, permissions)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.SESSION_EXPIRE_HOURS * 3600,
        refresh_token=req.refresh_token
    )

@router.post("/logout", status_code=204)
async def logout(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(UserSession).where(UserSession.refresh_token == req.refresh_token))
    await db.commit()
