from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    event_id: UUID | None = Field(None, description="Event ID to context-link the session")


class ChatSessionResponse(BaseModel):
    id: str
    event_id: str | None
    status: str
    message_count: int
    created_at: str


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User message")
    session_id: UUID = Field(..., description="Chat session ID")


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: list[ChatMessageResponse]