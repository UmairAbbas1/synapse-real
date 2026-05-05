from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.api.middleware.error_handler import AuthenticationError
from app.config import settings
from app.services.auth_service import AuthService


@contextmanager
def _auth_settings(minutes: int = 30):
    original_secret = getattr(settings, "JWT_SECRET", None)
    original_alg = getattr(settings, "JWT_ALGORITHM", None)
    original_exp = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", None)
    object.__setattr__(settings, "JWT_SECRET", "test-secret-key")
    object.__setattr__(settings, "JWT_ALGORITHM", "HS256")
    object.__setattr__(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", minutes)
    try:
        yield
    finally:
        if original_secret is None:
            delattr(settings, "JWT_SECRET")
        else:
            object.__setattr__(settings, "JWT_SECRET", original_secret)
        if original_alg is None:
            delattr(settings, "JWT_ALGORITHM")
        else:
            object.__setattr__(settings, "JWT_ALGORITHM", original_alg)
        if original_exp is None:
            delattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES")
        else:
            object.__setattr__(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", original_exp)


def test_auth_login_get_token() -> None:
    with _auth_settings(minutes=60):
        svc = AuthService()
        token = svc.create_access_token("user-123", "ADMIN", ["*"])
        assert isinstance(token, str)
        assert len(token) > 20


def test_auth_use_token() -> None:
    with _auth_settings(minutes=60):
        svc = AuthService()
        token = svc.create_access_token("user-123", "SENIOR_DEV", ["engineering"])
        payload = svc.verify_token(token)
        assert payload.sub == "user-123"
        assert payload.role == "SENIOR_DEV"
        assert payload.permissions == ["engineering"]


def test_auth_token_expiry() -> None:
    with _auth_settings(minutes=60):
        expired = jwt.encode(
            {
                "sub": "user-123",
                "role": "ADMIN",
                "permissions": ["*"],
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
                "iat": datetime.now(timezone.utc) - timedelta(minutes=2),
                "type": "access",
            },
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )
        with pytest.raises(AuthenticationError):
            AuthService().verify_token(expired)
