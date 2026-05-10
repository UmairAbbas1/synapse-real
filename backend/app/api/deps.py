"""API dependencies: auth, RBAC, audit, query engine."""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthService, decode_access_token, InvalidTokenError
from app.core.audit_logger import AuditLogger
from app.core.query_engine import QueryEngine
from app.db.postgres import get_db_session as get_db
from app.db.redis import get_redis_client
from app.models.user import User
from app.schemas.auth import CurrentUser

oauth2_scheme = HTTPBearer(auto_error=True)


def get_redis_dep() -> Redis:
    return get_redis_client()


async def get_auth_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_dep),
) -> AuthService:
    return AuthService(db, redis)


async def get_audit_logger(db: AsyncSession = Depends(get_db)) -> AuditLogger:
    return AuditLogger(db)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_dep),
) -> CurrentUser:
    token = credentials.credentials
    auth = AuthService(db, redis)
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    sid = str(payload.get("sid") or "")
    if not sid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if not await auth.validate_session(sid):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked or expired")

    uid = str(payload.get("sub") or "")
    user = await db.get(User, uuid.UUID(uid))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    role_name = user.role.name if user.role else "USER"
    permission_tags = list(user.role.permissions) if user.role and user.role.permissions else []

    return CurrentUser(
        id=str(user.id),
        email=user.email,
        role=role_name,
        permission_tags=permission_tags,
        session_id=sid,
    )


def require_role(role: str) -> Callable[..., Awaitable[CurrentUser]]:
    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return _checker


def require_permission(tag: str) -> Callable[..., Awaitable[CurrentUser]]:
    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        tags = user.permission_tags
        if "*" not in tags and tag not in tags:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission")
        return user

    return _checker


async def get_query_engine(request: Request) -> QueryEngine:
    """Return the initialized QueryEngine from application state."""
    return QueryEngine(
        embedding_svc=request.app.state.embedding_svc,
        vector_svc=request.app.state.vector_svc,
        graph_svc=request.app.state.graph_svc,
        llm_client=request.app.state.llm_client,
        expert_router=request.app.state.expert_router,
        prompt_builder=request.app.state.prompt_builder,
        citation_builder=request.app.state.citation_builder,
    )
