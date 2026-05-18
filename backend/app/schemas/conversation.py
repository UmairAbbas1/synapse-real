"""Chat conversation API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MessagePayload(BaseModel):
    id: str | None = None
    role: str
    content: str
    citations: list[dict[str, Any]] | None = None
    expert: dict[str, Any] | None = None
    confidence: float | None = None
    latency_ms: int | None = None
    status: str = "done"


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    updated_at: datetime
    message_count: int


class ConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    updated_at: datetime
    messages: list[MessagePayload]


class CreateConversationRequest(BaseModel):
    title: str = "New conversation"


class SaveConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    messages: list[MessagePayload] = Field(default_factory=list, max_length=200)
