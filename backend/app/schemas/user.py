from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserCreate(BaseModel):
    email: str
    display_name: str
    role_id: str
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    role_id: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
