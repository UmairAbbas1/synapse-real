from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import structlog

from app.config import settings
from app.api.middleware.error_handler import AuthenticationError
from app.schemas.auth import TokenPayload

logger = structlog.get_logger(__name__)

class AuthService:
    def create_access_token(self, user_id: str, role: str, permissions: list[str]) -> str:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
        payload = {
            "sub": user_id,
            "role": role,
            "permissions": permissions,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def verify_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("type") != "access":
                raise AuthenticationError("Invalid token type.")
            # Converting timestamps gracefully mapping native outputs reliably across the payload safely
            if "exp" in payload and isinstance(payload["exp"], (int, float)):
                payload["exp"] = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            return TokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token expired.")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token.")

    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
