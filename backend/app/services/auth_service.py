"""Compatibility JWT verification for legacy tests."""

from datetime import datetime, timezone

from app.api.middleware.error_handler import AuthenticationError
from app.core.auth import decode_access_token, InvalidTokenError
from app.schemas.auth import TokenPayload


class AuthService:
    """Minimal facade — interactive flows use core.auth.AuthService(db, redis)."""

    def verify_token(self, token: str) -> TokenPayload:
        try:
            payload = decode_access_token(token)
        except InvalidTokenError as exc:
            raise AuthenticationError("Invalid token.") from exc
        exp_raw = payload.get("exp")
        exp_dt = None
        if isinstance(exp_raw, (int, float)):
            exp_dt = datetime.fromtimestamp(exp_raw, tz=timezone.utc)
        raw_perms = payload.get("perms")
        perms = [str(x) for x in raw_perms] if isinstance(raw_perms, list) else []
        return TokenPayload(
            sub=str(payload["sub"]),
            role=str(payload.get("role") or "USER"),
            permissions=perms,
            exp=exp_dt,
            sid=str(payload["sid"]) if payload.get("sid") else None,
        )
