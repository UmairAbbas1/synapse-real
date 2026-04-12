from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SourceCreate(BaseModel):
    name: str
    source_type: str
    config: Dict[str, Any]
    default_permission_tags: List[str]
    sync_schedule: str

class SourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    last_sync_at: Optional[datetime] = None
    documents_count: int
    chunks_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
