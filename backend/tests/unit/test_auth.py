from __future__ import annotations
from datetime import datetime, timedelta, timezone
import pytest
import jwt
from app.core.auth import (
    hash_password, verify_password, create_access_token, 
    decode_access_token, InvalidTokenError, InvalidCredentialsError,
    AuthService
)
from app.config import settings
from unittest.mock import AsyncMock, MagicMock

class TestAuth:
    def test_password_hashing_roundtrip(self) -> None:
        password = "secret_password"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong", hashed) is False

    def test_jwt_roundtrip(self) -> None:
        user = MagicMock()
        user.id = "user-123"
        user.role.name = "ADMIN"
        user.role.permissions = ["read", "write"]
        session_id = "session-456"
        
        token = create_access_token(user, session_id)
        decoded = decode_access_token(token)
        
        assert decoded["sub"] == "user-123"
        assert decoded["role"] == "ADMIN"
        assert decoded["sid"] == "session-456"
        assert decoded["type"] == "access"

    def test_expired_token_raises_error(self) -> None:
        payload = {
            "sub": "user-123",
            "exp": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
            "type": "access",
            "sid": "123"
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        
        with pytest.raises(InvalidTokenError, match="token expired"):
            decode_access_token(token)

    @pytest.mark.asyncio
    async def test_auth_service_invalid_credentials(self) -> None:
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        service = AuthService(mock_db, mock_redis)
        
        with pytest.raises(InvalidCredentialsError):
            await service.authenticate("wrong@email.com", "password")
            
    @pytest.mark.asyncio
    async def test_auth_service_wrong_password(self) -> None:
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        user = MagicMock()
        user.password_hash = hash_password("correct")
        user.is_active = True
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = user
        mock_db.execute.return_value = mock_result
        
        service = AuthService(mock_db, mock_redis)
        
        with pytest.raises(InvalidCredentialsError):
            await service.authenticate("user@email.com", "wrong")
