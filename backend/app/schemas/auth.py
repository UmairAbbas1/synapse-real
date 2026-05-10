"""Authentication request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise ValueError("Invalid email address")
    return email


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserPublic(BaseModel):
    """Subset of user returned with login /me."""

    id: str
    email: str
    display_name: str
    role: str
    permission_tags: list[str]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800
    user: UserPublic


class TokenResponse(BaseModel):
    """Legacy refresh flows."""

    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str | None = None


class TokenPayload(BaseModel):
    sub: str
    role: str
    permissions: list[str]
    exp: datetime | None = None
    sid: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=10)


class CurrentUser(BaseModel):
    id: str
    email: str
    role: str
    permission_tags: list[str]
    session_id: str
