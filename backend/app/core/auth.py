"""Authentication primitives: password hashing, JWT sessions, and AuthService."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import structlog
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

logger = structlog.get_logger(__name__)

SESSION_REDIS_PREFIX = "session:"
SESSION_TTL_SECONDS = settings.SESSION_EXPIRE_HOURS * 3600


class InvalidCredentialsError(Exception):
    """Email/password mismatch or inactive user."""

    pass


class InvalidTokenError(Exception):
    """Malformed, wrong type, or expired JWT."""

    pass


class SessionRevokedError(Exception):
    """Session invalidated server-side."""

    pass


def hash_password(plain: str) -> str:
    """Hash password using bcrypt (native ``bcrypt`` avoids passlib backend init bugs)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plaintext password against a bcrypt hash string."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user: User, session_id: str) -> str:
    """HS256 JWT: sub, role, perms, sid, iat, exp (8h)."""
    role_name = user.role.name if user.role else "USER"
    perms = list(user.role.permissions) if user.role and user.role.permissions else []
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "role": role_name,
        "perms": perms,
        "sid": session_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, object]:
    """Decode JWT; raises InvalidTokenError on failure."""
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if decoded.get("type") != "access":
            raise InvalidTokenError("invalid token type")
        return dict(decoded)
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError("invalid token") from exc


class AuthService:
    """Stateful auth: DB sessions + Redis fast path."""

    def __init__(self, db: AsyncSession, redis: Redis) -> None:
        self.db = db
        self.redis = redis

    async def authenticate(self, email: str, password: str) -> User:
        res = await self.db.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise InvalidCredentialsError()
        # Ensure role is loaded
        _ = user.role
        return user

    async def create_session(self, user: User) -> tuple[str, str]:
        """Return (access_token, session_id); persist session row + Redis TTL."""
        from app.models.session import UserSession

        session_id = str(uuid.uuid4())
        token = create_access_token(user, session_id)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
        row = UserSession(
            id=uuid.UUID(session_id),
            user_id=user.id,
            token_hash=token_hash,
            refresh_token=None,
            expires_at=expires_at,
            is_active=True,
        )
        self.db.add(row)
        await self.db.commit()
        key = f"{SESSION_REDIS_PREFIX}{session_id}"
        await self.redis.setex(key, SESSION_TTL_SECONDS, json.dumps({"user_id": str(user.id)}))
        return token, session_id

    async def revoke_session(self, session_id: str) -> None:
        from app.models.session import UserSession

        await self.redis.delete(f"{SESSION_REDIS_PREFIX}{session_id}")
        await self.db.execute(
            update(UserSession)
            .where(UserSession.id == uuid.UUID(session_id))
            .values(is_active=False),
        )
        await self.db.commit()

    async def revoke_all_sessions_for_user(self, user_id: str) -> None:
        from app.models.session import UserSession

        res = await self.db.execute(select(UserSession).where(UserSession.user_id == uuid.UUID(user_id)))
        sessions = res.scalars().all()
        for s in sessions:
            await self.redis.delete(f"{SESSION_REDIS_PREFIX}{str(s.id)}")
        await self.db.execute(
            update(UserSession)
            .where(UserSession.user_id == uuid.UUID(user_id))
            .values(is_active=False),
        )
        await self.db.commit()

    async def validate_session(self, session_id: str) -> bool:
        """Redis first; fallback to DB active session."""
        from app.models.session import UserSession

        rkey = f"{SESSION_REDIS_PREFIX}{session_id}"
        if await self.redis.exists(rkey):
            return True
        row = await self.db.get(UserSession, uuid.UUID(session_id))
        if not row or not row.is_active:
            return False
        if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return False
        await self.redis.setex(rkey, SESSION_TTL_SECONDS, json.dumps({"user_id": str(row.user_id)}))
        return True
