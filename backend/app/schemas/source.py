from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict

class SourceBase(BaseModel):
    name: str
    source_type: str
    config: Dict
    default_permission_tags: list[str] = []

class SourceCreate(SourceBase):
    pass

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict] = None

class SourceResponse(SourceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
