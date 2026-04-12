from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int

class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: str

class HealthStatus(BaseModel):
    status: str
    services: dict[str, bool]
