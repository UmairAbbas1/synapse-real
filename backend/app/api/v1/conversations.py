"""User chat history API."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.postgres import get_db_session as get_db
from app.models.conversation import Conversation, ConversationMessage
from app.schemas.auth import CurrentUser

router = APIRouter()


class ConversationSummary(BaseModel):
    id: str
    title: str
    updated_at: datetime
    message_count: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    extra: dict[str, object] | None
    created_at: datetime


class ConversationDetail(BaseModel):
    id: str
    title: str
    updated_at: datetime
    messages: list[MessageOut]


class CreateConversationRequest(BaseModel):
    title: str = Field(default="New conversation", max_length=255)


class AppendMessageRequest(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=16000)
    extra: dict[str, object] | None = None


class UpdateTitleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


def _msg_out(m: ConversationMessage) -> MessageOut:
    return MessageOut(
        id=str(m.id),
        role=m.role,
        content=m.content,
        extra=m.extra,
        created_at=m.created_at,
    )


async def _get_owned_conversation(
    db: AsyncSession, conversation_id: str, user_id: str
) -> Conversation:
    conv = await db.get(Conversation, uuid.UUID(conversation_id))
    if not conv or conv.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[ConversationSummary]:
    stmt = (
        select(
            Conversation,
            func.count(ConversationMessage.id).label("message_count"),
        )
        .outerjoin(ConversationMessage, ConversationMessage.conversation_id == Conversation.id)
        .where(Conversation.user_id == user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
    )
    rows = (await db.execute(stmt)).all()
    return [
        ConversationSummary(
            id=str(conv.id),
            title=conv.title,
            updated_at=conv.updated_at,
            message_count=int(count or 0),
        )
        for conv, count in rows
    ]


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ConversationDetail:
    conv = Conversation(user_id=user.id, title=body.title.strip() or "New conversation")
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationDetail(
        id=str(conv.id),
        title=conv.title,
        updated_at=conv.updated_at,
        messages=[],
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ConversationDetail:
    stmt = (
        select(Conversation)
        .where(Conversation.id == uuid.UUID(conversation_id), Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
    )
    conv = (await db.execute(stmt)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return ConversationDetail(
        id=str(conv.id),
        title=conv.title,
        updated_at=conv.updated_at,
        messages=[_msg_out(m) for m in conv.messages],
    )


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation_title(
    conversation_id: str,
    body: UpdateTitleRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ConversationSummary:
    conv = await _get_owned_conversation(db, conversation_id, user.id)
    conv.title = body.title.strip()
    await db.commit()
    await db.refresh(conv)
    count = (
        await db.execute(
            select(func.count(ConversationMessage.id)).where(
                ConversationMessage.conversation_id == conv.id
            )
        )
    ).scalar_one()
    return ConversationSummary(
        id=str(conv.id),
        title=conv.title,
        updated_at=conv.updated_at,
        message_count=int(count or 0),
    )


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def append_message(
    conversation_id: str,
    body: AppendMessageRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> MessageOut:
    conv = await _get_owned_conversation(db, conversation_id, user.id)
    msg = ConversationMessage(
        conversation_id=conv.id,
        role=body.role,
        content=body.content.strip(),
        extra=body.extra,
    )
    db.add(msg)
    conv.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(msg)
    return _msg_out(msg)
