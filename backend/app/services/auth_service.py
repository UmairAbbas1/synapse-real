import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import structlog

from app.config import settings
from app.api.middleware.error_handler import AuthenticationError
from app.schemas.auth import TokenPayload

logger = structlog.get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def create_access_token(self, user_id: str, role: str, permissions: list[str]) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "role": role,
            "permissions": permissions,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def verify_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
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
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)
