"""Core user schema parameters strictly mapping validations flawlessly."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    is_active: bool

class RoleBase(BaseModel):
    name: str
    description: str
    permissions: list[str]

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[list[str]] = None

class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)
    id: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    role_id: str
    created_at: datetime
    updated_at: datetime
