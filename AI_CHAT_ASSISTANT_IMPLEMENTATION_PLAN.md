# AI Booking Assistant (RAG) — Full Implementation Plan

## Overview

A conversational AI assistant embedded on event pages and checkout flow that answers user questions grounded in real SeatFlow data — event details, ticket availability, booking policies, venue info, and FAQs. Uses Retrieval-Augmented Generation (RAG) with streaming responses via Server-Sent Events (SSE).

---

## Table of Contents

1. [How RAG Works in SeatFlow](#1-how-rag-works-in-seatflow)
2. [New Dependencies](#2-new-dependencies)
3. [Backend — Configuration](#3-backend--configuration)
4. [Backend — Database Models](#4-backend--database-models)
5. [Backend — Database Migrations](#5-backend--database-migrations)
6. [Backend — DAO Layer](#6-backend--dao-layer)
7. [Backend — LLM Provider Abstraction](#7-backend--llm-provider-abstraction)
8. [Backend — Context Retriever (RAG Core)](#8-backend--context-retriever-rag-core)
9. [Backend — Prompt Builder](#9-backend--prompt-builder)
10. [Backend — Chat Service](#10-backend--chat-service)
11. [Backend — API Endpoints & Schemas](#11-backend--api-endpoints--schemas)
12. [Backend — Router Registration](#12-backend--router-registration)
13. [Backend — Background Tasks](#13-backend--background-tasks)
14. [Backend — Knowledge Base Seeding](#14-backend--knowledge-base-seeding)
15. [Frontend — TypeScript Types](#15-frontend--typescript-types)
16. [Frontend — Chat API Service](#16-frontend--chat-api-service)
17. [Frontend — useChat Hook](#17-frontend--usechat-hook)
18. [Frontend — ChatWidget Component](#18-frontend--chatwidget-component)
19. [Frontend — Integration into Event Page](#19-frontend--integration-into-event-page)
20. [Frontend — Admin FAQ Management](#20-frontend--admin-faq-management)
21. [Testing Strategy](#21-testing-strategy)
22. [Environment Variables](#22-environment-variables)
23. [Implementation Order (Step-by-Step)](#23-implementation-order-step-by-step)

---

## 1. How RAG Works in SeatFlow

```
User types: "Are there still VIP seats for tonight's concert?"
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│  1. INTENT CLASSIFICATION (keyword + LLM)       │
│     → ticket_availability, event_details,       │
│       booking_policy, general                   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  2. CONTEXT RETRIEVAL                           │
│     • EventDAO.get_by_id(event_id)              │
│     • TicketDAO.get_available_by_event()        │
│     • KnowledgeEntryDAO.search(query)           │
│     • Static policy docs from config            │
│     All database calls — no vector DB needed    │
│     for Phase 1 (semantic search in Phase 2)    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  3. PROMPT CONSTRUCTION                         │
│     System:  "You are SeatFlow assistant..."    │
│     Context: {event, tickets, policies, faq}    │
│     History: {last 10 messages from session}    │
│     User:    "Are there still VIP seats..."     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  4. LLM STREAMING                               │
│     Provider streams tokens → SSE chunks        │
│     Each chunk: data: {"content": "...",         │
│       "action": null}                           │
│     Final chunk: data: {"done": true,            │
│       "action": {"type": "reserve", ...}}       │
└─────────────────────────────────────────────────┘
```

**Why this approach fits SeatFlow:**
- No new infrastructure (no vector DB in Phase 1) — uses existing PostgreSQL + Redis
- The chat data lives in the same database as events/bookings
- Context retrieval reuses existing DAOs (`EventDAO`, `TicketDAO`)
- SSE streaming works natively with FastAPI's `StreamingResponse`
- LLM provider is abstracted — swap OpenAI ↔ Anthropic ↔ local Ollama without touching service logic

---

## 2. New Dependencies

### Backend (add to pyproject.toml or requirements)

```
openai>=1.40.0            # OpenAI Python SDK (streaming support)
httpx>=0.27.0             # Already present (used by openai, but explicit for SSE)
```

No new database extensions needed for Phase 1. Phase 2 (semantic search) adds `pgvector`.

### Frontend (add to package.json)

No new packages needed. SSE is consumed via the native `fetch` API (not Axios). The `EventSource` browser API or `fetch` with `ReadableStream` handles SSE streaming.

---

## 3. Backend — Configuration

### File: `seatflow/config.py`

Add these fields to the existing `Settings` class:

```python
# --- ADD INSIDE class Settings(BaseSettings): ---

# AI Chat Assistant
chat_enabled: bool = True
chat_llm_provider: str = "openai"              # "openai" | "anthropic" | "ollama"
chat_llm_model: str = "gpt-4o-mini"            # Model name per provider
chat_llm_api_key: str = ""                      # API key for cloud providers
chat_llm_base_url: str = "https://api.openai.com/v1"  # Override for Ollama: http://localhost:11434/v1
chat_max_history_messages: int = 10             # Messages sent as conversation context
chat_max_session_messages: int = 30             # Max messages per session (abuse prevention)
chat_max_sessions_per_day: int = 10             # Max new sessions per user per day
chat_system_prompt: str = ""                    # Override default system prompt (optional)
chat_max_tokens: int = 500                      # Max tokens per response
chat_temperature: float = 0.3                   # Low temperature = factual, consistent answers
```

These settings follow the existing pattern: `SEATFLOW_` prefix in `.env`:

```bash
# .env.local additions
SEATFLOW_CHAT_ENABLED=true
SEATFLOW_CHAT_LLM_PROVIDER=openai
SEATFLOW_CHAT_LLM_MODEL=gpt-4o-mini
SEATFLOW_CHAT_LLM_API_KEY=sk-...
SEATFLOW_CHAT_MAX_HISTORY_MESSAGES=10
SEATFLOW_CHAT_MAX_SESSION_MESSAGES=30
SEATFLOW_CHAT_MAX_SESSIONS_PER_DAY=10
SEATFLOW_CHAT_MAX_TOKENS=500
SEATFLOW_CHAT_TEMPERATURE=0.3
```

---

## 4. Backend — Database Models

### File: `seatflow/db/models/chat.py` (NEW)

Following the exact pattern from `booking.py` and `event.py`:

```python
import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from seatflow.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from seatflow.db.models.user import User
    from seatflow.db.models.event import Event


class ChatMessageRole(str, enum.Enum):
    system = "system"
    user = "user"
    assistant = "assistant"


class ChatSessionStatus(str, enum.Enum):
    active = "active"
    closed = "closed"
    expired = "expired"


class ChatSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_sessions"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("events.id"), nullable=True, index=True
    )
    status: Mapped[ChatSessionStatus] = mapped_column(
        SQLEnum(ChatSessionStatus),
        default=ChatSessionStatus.active,
        nullable=False,
    )
    message_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    event: Mapped["Event | None"] = relationship()
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session",
        order_by="ChatMessage.created_at",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<ChatSession {self.id} - {self.status}>"


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_messages"

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("chat_sessions.id"), nullable=False, index=True
    )
    role: Mapped[ChatMessageRole] = mapped_column(
        SQLEnum(ChatMessageRole), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Context metadata stored as JSON string for transparency
    context_sources: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON: which data sources were used

    session: Mapped["ChatSession"] = relationship(back_populates="messages")

    def __repr__(self) -> str:
        return f"<ChatMessage {self.id} - {self.role}>"


class KnowledgeCategory(str, enum.Enum):
    booking_policy = "booking_policy"
    payment = "payment"
    flash_sale = "flash_sale"
    venue = "venue"
    general = "general"
    cancellation = "cancellation"


class KnowledgeEntry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "knowledge_entries"

    category: Mapped[KnowledgeCategory] = mapped_column(
        SQLEnum(KnowledgeCategory), nullable=False, index=True
    )
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[str] = mapped_column(Text, nullable=True)  # Comma-separated
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<KnowledgeEntry {self.id} - {self.category}>"
```

### File: `seatflow/db/models/user.py` (MODIFY)

Add the relationship to chat sessions:

```python
# Add to the User model's relationship section:
chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user", lazy="selectin")
```

### File: `seatflow/db/models/__init__.py` (MODIFY if exists, or ensure import)

Ensure the new models are imported so Alembic detects them:

```python
from seatflow.db.models.chat import ChatSession, ChatMessage, KnowledgeEntry
```

---

## 5. Backend — Database Migrations

```bash
cd backend
make migrate MSG="add_chat_sessions_messages_knowledge_entries"
```

This generates an Alembic migration creating three tables:
- `chat_sessions` — conversation containers
- `chat_messages` — individual messages with role and content
- `knowledge_entries` — FAQ/policy entries for RAG context

```bash
make upgrade  # Apply the migration
```

---

## 6. Backend — DAO Layer

### File: `seatflow/db/dao/chat_session.py` (NEW)

Following the exact pattern from `seatflow/db/dao/event.py`:

```python
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import (
    ChatMessage,
    ChatMessageRole,
    ChatSession,
    ChatSessionStatus,
)


class ChatSessionDAO:
    """Data access for chat sessions."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: dict[str, Any]) -> ChatSession:
        chat_session = ChatSession(**data)
        self.session.add(chat_session)
        await self.session.flush()
        await self.session.refresh(chat_session)
        return chat_session

    async def get_by_id(self, session_id: UUID) -> ChatSession | None:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_session(
        self, user_id: UUID, event_id: UUID | None = None
    ) -> ChatSession | None:
        """Get the user's active session for an event (or general session)."""
        conditions = [
            ChatSession.user_id == user_id,
            ChatSession.status == ChatSessionStatus.active,
        ]
        if event_id:
            conditions.append(ChatSession.event_id == event_id)
        else:
            conditions.append(ChatSession.event_id.is_(None))

        stmt = select(ChatSession).where(and_(*conditions))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_sessions_today(self, user_id: UUID) -> int:
        """Count sessions created by user today (for rate limiting)."""
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        stmt = select(func.count()).where(
            and_(
                ChatSession.user_id == user_id,
                ChatSession.created_at >= today_start,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_recent_messages(
        self, session_id: UUID, limit: int = 10
    ) -> list[ChatMessage]:
        """Get recent messages for context (limited by config)."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = list(result.scalars().all())
        messages.reverse()  # Chronological order
        return messages

    async def increment_message_count(self, session_id: UUID) -> None:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        session = (await self.session.execute(stmt)).scalar_one_or_none()
        if session:
            session.message_count += 1
            await self.session.flush()

    async def close_session(self, session_id: UUID) -> None:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        session = (await self.session.execute(stmt)).scalar_one_or_none()
        if session:
            session.status = ChatSessionStatus.closed
            await self.session.flush()

    async def expire_old_sessions(self, older_than: datetime) -> int:
        """Close sessions inactive since the given time."""
        stmt = select(ChatSession).where(
            and_(
                ChatSession.status == ChatSessionStatus.active,
                ChatSession.updated_at < older_than,
            )
        )
        result = await self.session.execute(stmt)
        sessions = list(result.scalars().all())
        for s in sessions:
            s.status = ChatSessionStatus.expired
        await self.session.flush()
        return len(sessions)
```

### File: `seatflow/db/dao/chat_message.py` (NEW)

```python
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import ChatMessage, ChatMessageRole


class ChatMessageDAO:
    """Data access for chat messages."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: dict[str, Any]) -> ChatMessage:
        message = ChatMessage(**data)
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_by_session(self, session_id: UUID) -> list[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_session(self, session_id: UUID) -> int:
        from sqlalchemy import func
        stmt = select(func.count()).where(ChatMessage.session_id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0
```

### File: `seatflow/db/dao/knowledge.py` (NEW)

```python
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import KnowledgeCategory, KnowledgeEntry


class KnowledgeEntryDAO:
    """Data access for knowledge base entries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: dict[str, Any]) -> KnowledgeEntry:
        entry = KnowledgeEntry(**data)
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def get_by_id(self, entry_id: UUID) -> KnowledgeEntry | None:
        stmt = select(KnowledgeEntry).where(KnowledgeEntry.id == entry_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(
        self,
        category: KnowledgeCategory | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[KnowledgeEntry]:
        stmt = select(KnowledgeEntry).where(KnowledgeEntry.is_active.is_(True))
        if category:
            stmt = stmt.where(KnowledgeEntry.category == category)
        stmt = stmt.order_by(KnowledgeEntry.priority.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(self, query: str, limit: int = 5) -> list[KnowledgeEntry]:
        """Keyword search over question, answer, and keywords fields.

        Phase 2 replaces this with pgvector semantic search.
        """
        term = f"%{query.lower()}%"
        stmt = (
            select(KnowledgeEntry)
            .where(
                KnowledgeEntry.is_active.is_(True),
                or_(
                    KnowledgeEntry.question.ilike(term),
                    KnowledgeEntry.answer.ilike(term),
                    KnowledgeEntry.keywords.ilike(term),
                ),
            )
            .order_by(KnowledgeEntry.priority.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, entry: KnowledgeEntry, data: dict[str, Any]) -> KnowledgeEntry:
        for field, value in data.items():
            setattr(entry, field, value)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry

    async def delete(self, entry: KnowledgeEntry) -> None:
        await self.session.delete(entry)
```

---

## 7. Backend — LLM Provider Abstraction

### File: `seatflow/services/chat/__init__.py` (NEW)

```python
# Empty init for service package
```

### File: `seatflow/services/chat/llm_provider.py` (NEW)

This is the abstraction layer. The chat service never talks to a specific LLM directly — it goes through this interface.

```python
import json
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger


class LLMResponseChunk:
    """A single chunk of streamed LLM response."""

    def __init__(self, content: str | None = None, done: bool = False,
                 action: dict[str, Any] | None = None, usage: dict[str, int] | None = None):
        self.content = content
        self.done = done
        self.action = action
        self.usage = usage

    def to_sse(self) -> str:
        data = {"content": self.content, "done": self.done}
        if self.action:
            data["action"] = self.action
        if self.usage:
            data["usage"] = self.usage
        return f"data: {json.dumps(data)}\n\n"


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        """Stream a chat completion response."""
        ...


class OpenAIProvider(BaseLLMProvider):
    """OpenAI / Ollama-compatible provider (both use the same API format)."""

    def __init__(self) -> None:
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=settings.chat_llm_api_key or "ollama",
            base_url=settings.chat_llm_base_url,
        )
        self.model = settings.chat_llm_model

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        ServiceLogger.log_external(
            service="OpenAI",
            operation="stream_chat",
            model=self.model,
            message_count=len(messages),
        )

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        total_tokens = 0
        async for chunk in stream:
            if chunk.usage:
                total_tokens = chunk.usage.total_tokens or 0

            delta = chunk.choices[0].delta if chunk.choices else None

            if delta and delta.content:
                yield LLMResponseChunk(content=delta.content)

            if chunk.choices and chunk.choices[0].finish_reason == "stop":
                yield LLMResponseChunk(done=True, usage={"total_tokens": total_tokens})


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider."""

    def __init__(self) -> None:
        import anthropic

        self.client = anthropic.AsyncAnthropic(api_key=settings.chat_llm_api_key)
        self.model = settings.chat_llm_model

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        # Anthropic separates system prompt from messages
        system_msg = ""
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_messages.append(m)

        async with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_msg,
            messages=chat_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield LLMResponseChunk(content=text)

            message = await stream.get_final_message()
            yield LLMResponseChunk(
                done=True,
                usage={"total_tokens": (message.usage.input_tokens or 0) + (message.usage.output_tokens or 0)},
            )


class MockLLMProvider(BaseLLMProvider):
    """Mock provider for development without an LLM API key."""

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        import asyncio

        user_message = messages[-1]["content"] if messages else ""

        # Simple keyword-based mock responses
        mock_response = (
            f"I'm the SeatFlow assistant. You asked: '{user_message}'. "
            "In development mode, I can't provide real AI responses. "
            "Configure SEATFLOW_CHAT_LLM_API_KEY to enable real responses."
        )

        # Stream word by word to simulate streaming
        words = mock_response.split(" ")
        for i, word in enumerate(words):
            await asyncio.sleep(0.03)
            yield LLMResponseChunk(content=word + (" " if i < len(words) - 1 else ""))

        yield LLMResponseChunk(done=True, usage={"total_tokens": len(mock_response.split())})


def get_llm_provider() -> BaseLLMProvider:
    """Factory function — returns the configured provider."""
    if not settings.chat_enabled:
        raise RuntimeError("Chat is disabled in configuration")

    if not settings.chat_llm_api_key and settings.chat_llm_provider != "ollama":
        ServiceLogger.log(
            service="ChatService",
            operation="get_llm_provider",
            level="warning",
            message="No API key configured, using mock provider",
        )
        return MockLLMProvider()

    providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OpenAIProvider,  # Ollama uses OpenAI-compatible API
    }

    provider_class = providers.get(settings.chat_llm_provider)
    if not provider_class:
        raise ValueError(f"Unknown LLM provider: {settings.chat_llm_provider}")

    return provider_class()
```

---

## 8. Backend — Context Retriever (RAG Core)

### File: `seatflow/services/chat/context_retriever.py` (NEW)

This is the RAG brain — it gathers real SeatFlow data relevant to the user's question.

```python
import json
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.db.dao.event import EventDAO
from seatflow.db.dao.ticket import TicketDAO
from seatflow.db.dao.knowledge import KnowledgeEntryDAO
from seatflow.core.logging.service_logger import ServiceLogger


class ContextRetriever:
    """Gathers relevant context from the SeatFlow database for RAG."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.event_repo = EventDAO(session)
        self.knowledge_repo = KnowledgeEntryDAO(session)

    async def retrieve(
        self,
        user_message: str,
        event_id: UUID | None = None,
    ) -> tuple[str, list[str]]:
        """Retrieve relevant context for a user message.

        Returns:
            (context_text, sources) — formatted context string and list of source names
        """
        sections: list[str] = []
        sources: list[str] = []

        # 1. Event-specific data (if event_id provided or inferred)
        if event_id:
            event_context = await self._get_event_context(event_id)
            if event_context:
                sections.append(event_context)
                sources.append("event_data")

            ticket_context = await self._get_ticket_context(event_id)
            if ticket_context:
                sections.append(ticket_context)
                sources.append("ticket_availability")

        # 2. Knowledge base search (FAQs, policies)
        kb_context = await self._get_knowledge_context(user_message)
        if kb_context:
            sections.append(kb_context)
            sources.append("knowledge_base")

        # 3. Static booking policies (always included)
        policy_context = self._get_static_policies()
        sections.append(policy_context)
        sources.append("booking_policies")

        context_text = "\n\n---\n\n".join(sections)
        return context_text, sources

    async def _get_event_context(self, event_id: UUID) -> str | None:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            return None

        return (
            f"## Current Event Details\n"
            f"- Title: {event.title}\n"
            f"- Venue: {event.venue}\n"
            f"- Event Date: {event.event_date.isoformat()}\n"
            f"- Sale Period: {event.sale_start_date.isoformat()} to {event.sale_end_date.isoformat()}\n"
            f"- Total Tickets: {event.total_tickets}\n"
            f"- Available Tickets: {event.available_tickets}\n"
            f"- Price Per Ticket: ${event.price_per_ticket:.2f}\n"
            f"- Active: {event.is_active}\n"
            f"- Sold Out: {event.available_tickets == 0}\n"
        )

    async def _get_ticket_context(self, event_id: UUID) -> str | None:
        try:
            ticket_repo = TicketDAO(self.session)
            # Use existing DAO method or add a new one
            from sqlalchemy import select, func
            from seatflow.db.models.ticket import Ticket, TicketStatus

            # Count by status
            stmt = (
                select(Ticket.status, func.count(Ticket.id))
                .where(Ticket.event_id == event_id)
                .group_by(Ticket.status)
            )
            result = await self.session.execute(stmt)
            status_counts = dict(result.all())

            available = status_counts.get(TicketStatus.available, 0)
            reserved = status_counts.get(TicketStatus.reserved, 0)
            sold = status_counts.get(TicketStatus.sold, 0)

            # Get available tickets by section
            section_stmt = (
                select(Ticket.section, Ticket.seat_type, func.count(Ticket.id))
                .where(Ticket.event_id == event_id, Ticket.status == TicketStatus.available)
                .group_by(Ticket.section, Ticket.seat_type)
            )
            section_result = await self.session.execute(section_stmt)
            sections = list(section_result.all())

            section_details = "\n".join(
                f"  - Section {s or 'General'} ({t or 'general'}): {c} available"
                for s, t, c in sections
            )

            return (
                f"## Ticket Availability\n"
                f"- Available: {available}\n"
                f"- Reserved (held): {reserved}\n"
                f"- Sold: {sold}\n"
                f"- Breakdown by section:\n{section_details}\n"
            )
        except Exception as e:
            ServiceLogger.log(
                service="ContextRetriever",
                operation="get_ticket_context",
                error=str(e),
                level="warning",
            )
            return None

    async def _get_knowledge_context(self, query: str) -> str | None:
        entries = await self.knowledge_repo.search(query, limit=3)
        if not entries:
            return None

        faq_text = "## Frequently Asked Questions\n"
        for entry in entries:
            faq_text += f"**Q: {entry.question}**\nA: {entry.answer}\n\n"

        return faq_text

    def _get_static_policies(self) -> str:
        return (
            "## Booking & Payment Policies\n"
            f"- Reservation hold time: {settings.reservation_timeout_seconds // 60} minutes\n"
            f"- Max tickets per user per event: {settings.max_tickets_per_user}\n"
            "- Payment method: Stripe (credit/debit cards)\n"
            "- After reservation, you must complete payment before the hold expires\n"
            "- Expired reservations automatically release tickets back to the pool\n"
            "- Confirmed bookings receive a PDF ticket via email\n"
        )
```

---

## 9. Backend — Prompt Builder

### File: `seatflow/services/chat/prompt_builder.py` (NEW)

```python
from seatflow.config import settings


DEFAULT_SYSTEM_PROMPT = """You are the SeatFlow AI Booking Assistant. You help users with event information, ticket availability, booking questions, and payment inquiries.

Rules:
1. ONLY answer based on the provided context. If the context doesn't contain the answer, say "I don't have that information right now. Please contact support for help."
2. Be concise — most answers should be 2-3 sentences maximum.
3. If a user asks about ticket availability, always reference the exact numbers from the context.
4. If a user wants to book tickets, suggest they click the "Reserve Tickets" button on the page.
5. Never make up event details, prices, or availability numbers.
6. Be friendly but professional.
7. If asked about something unrelated to SeatFlow or events, politely redirect.
8. Always mention that reservation holds last 5 minutes and users should complete payment quickly during flash sales.

When you detect the user wants to take an action (like booking tickets), include a JSON action at the end of your response wrapped in [ACTION] tags:
- To suggest reservation: [ACTION]{"type": "reserve", "event_id": "<id>"}[/ACTION]
- To suggest viewing events: [ACTION]{"type": "browse_events"}[/ACTION]

Do NOT include [ACTION] tags unless the user explicitly wants to do something."""


def build_messages(
    user_message: str,
    context: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:
    """Build the full message list for the LLM.

    Args:
        user_message: The current user message
        context: Retrieved context from ContextRetriever
        history: List of {"role": "user"|"assistant", "content": "..."} dicts

    Returns:
        List of messages in OpenAI format: [{"role": ..., "content": ...}]
    """
    system_prompt = settings.chat_system_prompt or DEFAULT_SYSTEM_PROMPT

    # Inject context into the system prompt
    full_system = f"{system_prompt}\n\n---\n\n## Current Context\n\n{context}"

    messages: list[dict[str, str]] = [
        {"role": "system", "content": full_system},
    ]

    # Add conversation history (limited by config)
    max_history = settings.chat_max_history_messages
    trimmed_history = history[-max_history:] if len(history) > max_history else history
    messages.extend(trimmed_history)

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    return messages
```

---

## 10. Backend — Chat Service

### File: `seatflow/services/chat/chat_service.py` (NEW)

Following the exact pattern from `BookingService` — accepts session, instantiates DAOs.

```python
import json
import re
from collections.abc import AsyncGenerator
from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.core.exceptions import BadRequestException, RateLimitException
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dao.chat_session import ChatSessionDAO
from seatflow.db.dao.chat_message import ChatMessageDAO
from seatflow.db.models.chat import ChatMessageRole, ChatSessionStatus
from seatflow.services.chat.context_retriever import ContextRetriever
from seatflow.services.chat.llm_provider import LLMResponseChunk, get_llm_provider
from seatflow.services.chat.prompt_builder import build_messages


class ChatService:
    """Service for AI chat assistant operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.session_repo = ChatSessionDAO(session)
        self.message_repo = ChatMessageDAO(session)

    async def create_session(
        self, user_id: UUID, event_id: UUID | None = None
    ) -> dict:
        """Create a new chat session or return existing active one."""
        # Rate limit check
        sessions_today = await self.session_repo.count_sessions_today(user_id)
        if sessions_today >= settings.chat_max_sessions_per_day:
            raise RateLimitException(
                detail=f"Daily chat session limit reached ({settings.chat_max_sessions_per_day})"
            )

        # Reuse active session if exists
        existing = await self.session_repo.get_active_session(user_id, event_id)
        if existing:
            return {
                "id": str(existing.id),
                "event_id": str(existing.event_id) if existing.event_id else None,
                "status": existing.status.value,
                "message_count": existing.message_count,
                "created_at": existing.created_at.isoformat(),
            }

        chat_session = await self.session_repo.create({
            "user_id": user_id,
            "event_id": event_id,
            "status": ChatSessionStatus.active,
            "message_count": 0,
        })

        ServiceLogger.log(
            service="ChatService",
            operation="create_session",
            user_id=str(user_id),
            entity_id=str(chat_session.id),
            event_id=str(event_id) if event_id else None,
        )

        return {
            "id": str(chat_session.id),
            "event_id": str(chat_session.event_id) if chat_session.event_id else None,
            "status": chat_session.status.value,
            "message_count": chat_session.message_count,
            "created_at": chat_session.created_at.isoformat(),
        }

    async def process_message(
        self,
        session_id: UUID,
        user_id: UUID,
        message: str,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        """Process a user message and stream the AI response."""
        # Validate session
        chat_session = await self.session_repo.get_by_id(session_id)
        if not chat_session:
            raise BadRequestException(detail="Chat session not found")

        if chat_session.user_id != user_id:
            raise BadRequestException(detail="Not your chat session")

        if chat_session.status != ChatSessionStatus.active:
            raise BadRequestException(detail="Chat session is closed")

        # Check message limit
        message_count = await self.message_repo.count_by_session(session_id)
        if message_count >= settings.chat_max_session_messages:
            raise RateLimitException(
                detail=f"Session message limit reached ({settings.chat_max_session_messages})"
            )

        # Save user message
        await self.message_repo.create({
            "session_id": session_id,
            "role": ChatMessageRole.user,
            "content": message,
            "tokens_used": 0,
        })

        # Retrieve context (RAG)
        context_retriever = ContextRetriever(self.session)
        context, sources = await context_retriever.retrieve(
            user_message=message,
            event_id=chat_session.event_id,
        )

        # Get conversation history
        recent_messages = await self.session_repo.get_recent_messages(
            session_id,
            limit=settings.chat_max_history_messages,
        )
        history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in recent_messages
            if msg.role != ChatMessageRole.system
        ]

        # Build prompt
        messages = build_messages(
            user_message=message,
            context=context,
            history=history,
        )

        # Stream LLM response
        provider = get_llm_provider()
        full_response = ""
        total_tokens = 0

        try:
            async for chunk in provider.stream_chat(
                messages=messages,
                max_tokens=settings.chat_max_tokens,
                temperature=settings.chat_temperature,
            ):
                if chunk.content:
                    full_response += chunk.content
                if chunk.done:
                    total_tokens = chunk.usage.get("total_tokens", 0) if chunk.usage else 0
                yield chunk

            # Parse action from response
            action = self._extract_action(full_response)

            # Clean response text (remove action tags)
            clean_response = self._strip_action_tags(full_response)

            # Save assistant message
            await self.message_repo.create({
                "session_id": session_id,
                "role": ChatMessageRole.assistant,
                "content": clean_response,
                "tokens_used": total_tokens,
                "context_sources": json.dumps(sources),
            })

            await self.session_repo.increment_message_count(session_id)

            # If action detected, send it as the final chunk
            if action:
                yield LLMResponseChunk(done=True, action=action)

            ServiceLogger.log(
                service="ChatService",
                operation="process_message",
                user_id=str(user_id),
                entity_id=str(session_id),
                success=True,
                tokens_used=total_tokens,
                sources=sources,
            )

        except Exception as e:
            ServiceLogger.log(
                service="ChatService",
                operation="process_message",
                user_id=str(user_id),
                entity_id=str(session_id),
                success=False,
                error=str(e),
            )
            raise

    async def get_history(self, session_id: UUID, user_id: UUID) -> list[dict]:
        """Get message history for a session."""
        chat_session = await self.session_repo.get_by_id(session_id)
        if not chat_session:
            raise BadRequestException(detail="Chat session not found")

        if chat_session.user_id != user_id:
            raise BadRequestException(detail="Not your chat session")

        messages = await self.message_repo.get_by_session(session_id)
        return [
            {
                "id": str(msg.id),
                "role": msg.role.value,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ]

    async def close_session(self, session_id: UUID, user_id: UUID) -> None:
        """Close a chat session."""
        chat_session = await self.session_repo.get_by_id(session_id)
        if not chat_session:
            raise BadRequestException(detail="Chat session not found")

        if chat_session.user_id != user_id:
            raise BadRequestException(detail="Not your chat session")

        await self.session_repo.close_session(session_id)

    def _extract_action(self, text: str) -> dict | None:
        """Extract [ACTION]{...}[/ACTION] from LLM response."""
        match = re.search(r'\[ACTION\](.*?)\[/ACTION\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                return None
        return None

    def _strip_action_tags(self, text: str) -> str:
        """Remove [ACTION]...[/ACTION] blocks from response text."""
        return re.sub(r'\[ACTION\].*?\[/ACTION\]', '', text, flags=re.DOTALL).strip()
```

---

## 11. Backend — API Endpoints & Schemas

### File: `seatflow/web/api/chat/__init__.py` (NEW)

```python
from seatflow.web.api.chat.views import router

__all__ = ["router"]
```

### File: `seatflow/web/api/chat/schema.py` (NEW)

Following the exact pattern from `bookings/schema.py`:

```python
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    """Request to create a chat session."""

    event_id: UUID | None = Field(None, description="Event ID to context-link the session")


class ChatSessionResponse(BaseModel):
    """Response with session details."""

    id: str
    event_id: str | None
    status: str
    message_count: int
    created_at: str


class ChatMessageRequest(BaseModel):
    """Request to send a chat message."""

    message: str = Field(..., min_length=1, max_length=1000, description="User message")
    session_id: UUID = Field(..., description="Chat session ID")


class ChatMessageResponse(BaseModel):
    """Single message in history."""

    id: str
    role: str
    content: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    """Paginated chat history response."""

    session_id: str
    messages: list[ChatMessageResponse]
```

### File: `seatflow/web/api/chat/views.py` (NEW)

Following the exact pattern from `bookings/views.py` — thin handlers that delegate to service:

```python
import json
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.db.dependencies import get_db_session
from seatflow.db.models.user import User
from seatflow.web.api.deps import get_current_active_user
from seatflow.web.api.chat.schema import (
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
)
from seatflow.services.chat.chat_service import ChatService

router = APIRouter()


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    summary="Create a chat session",
)
async def create_session(
    request: Request,
    session_data: ChatSessionCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ChatSessionResponse:
    """Create or retrieve an active chat session."""
    ServiceLogger.log_service_operation(
        service_name="ChatService",
        operation="create_session",
        user_id=str(current_user.id),
        details={"event_id": str(session_data.event_id) if session_data.event_id else None},
    )

    chat_service = ChatService(db_session)
    session = await chat_service.create_session(current_user.id, session_data.event_id)
    return ChatSessionResponse(**session)


@router.post(
    "/sessions/{session_id}/messages",
    summary="Send a message and get AI response (streamed via SSE)",
)
async def send_message(
    request: Request,
    session_id: UUID,
    message_data: ChatMessageRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db_session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    """Send a message to the AI assistant. Response is streamed via SSE."""
    import time
    start_time = time.time()

    ServiceLogger.log_service_operation(
        service_name="ChatService",
        operation="send_message",
        user_id=str(current_user.id),
        entity_id=str(session_id),
        details={"message_length": len(message_data.message)},
    )

    async def event_stream():
        chat_service = ChatService(db_session)
        try:
            async for chunk in chat_service.process_message(
                session_id=session_id,
                user_id=current_user.id,
                message=message_data.message,
            ):
                yield chunk.to_sse()

            await db_session.commit()
        except Exception as e:
            ServiceLogger.log_service_operation(
                service_name="ChatService",
                operation="send_message",
                user_id=str(current_user.id),
                entity_id=str(session_id),
                success=False,
                error=str(e),
            )
            error_data = json.dumps({"error": str(e), "done": True})
            yield f"data: {error_data}\n\n"
            await db_session.rollback()

        ServiceLogger.log_service_operation(
            service_name="ChatService",
            operation="send_message",
            user_id=str(current_user.id),
            entity_id=str(session_id),
            success=True,
            details={"duration_ms": round((time.time() - start_time) * 1000, 2)},
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/sessions/{session_id}/history",
    response_model=ChatHistoryResponse,
    summary="Get chat history",
)
async def get_history(
    request: Request,
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db_session: AsyncSession = Depends(get_db_session),
) -> ChatHistoryResponse:
    """Get message history for a chat session."""
    chat_service = ChatService(db_session)
    messages = await chat_service.get_history(session_id, current_user.id)

    return ChatHistoryResponse(
        session_id=str(session_id),
        messages=[ChatMessageResponse(**msg) for msg in messages],
    )


@router.post(
    "/sessions/{session_id}/close",
    summary="Close a chat session",
    status_code=204,
)
async def close_session(
    request: Request,
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db_session: AsyncSession = Depends(get_db_session),
) -> None:
    """Close an active chat session."""
    chat_service = ChatService(db_session)
    await chat_service.close_session(session_id, current_user.id)
```

---

## 12. Backend — Router Registration

### File: `seatflow/web/api/router.py` (MODIFY)

Add one line:

```python
from fastapi.routing import APIRouter

from seatflow.web.api import auth, events, bookings, payments, admin, monitoring, chat

api_router = APIRouter()

api_router.include_router(monitoring.router)
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
api_router.include_router(events.router, prefix="/v1/events", tags=["Events"])
api_router.include_router(bookings.router, prefix="/v1/reservations", tags=["Reservations"])
api_router.include_router(payments.router, prefix="/v1/payments", tags=["Payments"])
api_router.include_router(admin.router, prefix="/v1/admin", tags=["Admin"])
api_router.include_router(chat.router, prefix="/v1/chat", tags=["Chat"])  # <-- NEW
```

---

## 13. Backend — Background Tasks

### File: `seatflow/tasks/chat_tasks.py` (NEW)

Following the pattern from `tasks.py`:

```python
from datetime import datetime, timedelta

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.tasks.celery_app import celery_app
from seatflow.log import configure_logging

configure_logging()


@celery_app.task(name="seatflow.tasks.chat_tasks.cleanup_expired_chat_sessions")
def cleanup_expired_chat_sessions() -> dict[str, int]:
    """Close chat sessions that have been inactive for more than 1 hour."""
    ServiceLogger.log(
        service="BackgroundTask",
        operation="cleanup_expired_sessions",
        action="start",
    )

    import asyncio
    import nest_asyncio
    nest_asyncio.apply()

    async def _cleanup() -> int:
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from seatflow.db.dao.chat_session import ChatSessionDAO

        engine = create_async_engine(
            str(settings.db_url),
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        try:
            async with session_maker() as session:
                repo = ChatSessionDAO(session)
                threshold = datetime.utcnow() - timedelta(hours=1)
                count = await repo.expire_old_sessions(threshold)
                await session.commit()
                return count
        finally:
            await engine.dispose()

    try:
        count = asyncio.run(_cleanup())
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_sessions",
            action="completed",
            expired_count=count,
        )
        return {"expired_count": count, "status": "completed"}
    except Exception as e:
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_sessions",
            action="error",
            error=str(e),
            level="error",
        )
        raise
```

Register in Celery Beat schedule for hourly cleanup (in `seatflow/tasks/celery_app.py`):

```python
# Add to beat_schedule if it exists, or create it:
beat_schedule = {
    "cleanup-expired-chat-sessions": {
        "task": "seatflow.tasks.chat_tasks.cleanup_expired_chat_sessions",
        "schedule": 3600.0,  # Every hour
    },
}
```

---

## 14. Backend — Knowledge Base Seeding

### File: `seatflow/scripts/seed_knowledge.py` (NEW)

A script to populate the knowledge base with initial FAQ entries:

```python
"""Seed the knowledge base with default FAQ entries.

Usage:
    cd backend
    python -m seatflow.scripts.seed_knowledge
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from seatflow.config import settings
from seatflow.db.dao.knowledge import KnowledgeEntryDAO

SEED_ENTRIES = [
    {
        "category": "booking_policy",
        "question": "How long is my reservation held?",
        "answer": "Your reservation is held for 5 minutes. You must complete payment within this time or the tickets will be released back to the pool.",
        "keywords": "reservation, hold, time, expire, timeout",
        "is_active": True,
        "priority": 10,
    },
    {
        "category": "booking_policy",
        "question": "How many tickets can I buy at once?",
        "answer": "You can reserve up to 5 tickets per event. This limit ensures fair access during flash sales.",
        "keywords": "limit, maximum, tickets, per user, buy",
        "is_active": True,
        "priority": 10,
    },
    {
        "category": "flash_sale",
        "question": "What is a flash sale?",
        "answer": "A flash sale is a limited-time ticket release with high demand. Tickets are available on a first-come, first-served basis. Reserve quickly and complete payment within 5 minutes to secure your seats.",
        "keywords": "flash sale, limited, time, demand, rush",
        "is_active": True,
        "priority": 9,
    },
    {
        "category": "flash_sale",
        "question": "What happens if my reservation expires?",
        "answer": "If you don't complete payment within 5 minutes, your reservation is automatically cancelled and the tickets are released back for others to purchase. You can try again if tickets are still available.",
        "keywords": "expire, cancelled, release, payment, timeout",
        "is_active": True,
        "priority": 9,
    },
    {
        "category": "payment",
        "question": "What payment methods do you accept?",
        "answer": "We accept credit and debit cards via Stripe. Payment is processed securely and you'll receive a receipt via email after confirmation.",
        "keywords": "payment, stripe, credit card, debit, pay, method",
        "is_active": True,
        "priority": 8,
    },
    {
        "category": "payment",
        "question": "Can I get a refund?",
        "answer": "Refund policies vary by event. Generally, refunds are available up to 48 hours before the event. Contact support for refund requests.",
        "keywords": "refund, money back, cancel, return",
        "is_active": True,
        "priority": 8,
    },
    {
        "category": "cancellation",
        "question": "How do I cancel my booking?",
        "answer": "Go to your Bookings page, find the booking you want to cancel, and click Cancel. If the booking is confirmed, you may be eligible for a refund depending on the event's cancellation policy.",
        "keywords": "cancel, booking, cancel, stop",
        "is_active": True,
        "priority": 7,
    },
    {
        "category": "general",
        "question": "How do I download my tickets?",
        "answer": "After your booking is confirmed, go to your Bookings page and click the Download button to get your PDF tickets.",
        "keywords": "download, tickets, pdf, get tickets",
        "is_active": True,
        "priority": 7,
    },
    {
        "category": "venue",
        "question": "Where can I find venue information?",
        "answer": "Venue details including address are shown on each event page. Click on an event to see the full venue information.",
        "keywords": "venue, location, address, where, directions",
        "is_active": True,
        "priority": 5,
    },
    {
        "category": "general",
        "question": "Do I need an account to buy tickets?",
        "answer": "Yes, you need a SeatFlow account to purchase tickets. Registration is quick and free. This helps us manage your bookings and send you ticket confirmations.",
        "keywords": "account, register, sign up, create, needed",
        "is_active": True,
        "priority": 6,
    },
]


async def seed():
    engine = create_async_engine(str(settings.db_url))
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with session_maker() as session:
        repo = KnowledgeEntryDAO(session)

        existing = await repo.list_active(limit=100)
        if existing:
            print(f"Knowledge base already has {len(existing)} entries. Skipping seed.")
            return

        for entry_data in SEED_ENTRIES:
            await repo.create(entry_data)

        await session.commit()
        print(f"Seeded {len(SEED_ENTRIES)} knowledge base entries.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
```

---

## 15. Frontend — TypeScript Types

### File: `src/types/index.ts` (MODIFY — append to existing)

Add these types at the end of the existing file:

```typescript
// --- Chat Types ---

export interface ChatSession {
  id: string;
  event_id: string | null;
  status: "active" | "closed" | "expired";
  message_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatMessageRequest {
  message: string;
  session_id: string;
}

export interface ChatSessionCreate {
  event_id?: string | null;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessage[];
}

export interface SSEChatChunk {
  content: string | null;
  done: boolean;
  action?: {
    type: "reserve" | "browse_events";
    event_id?: string;
  } | null;
  error?: string;
  usage?: {
    total_tokens: number;
  };
}
```

---

## 16. Frontend — Chat API Service

### File: `src/services/chat.ts` (NEW)

Following the pattern from `services/admin.ts`:

```typescript
import { apiClient } from "@/lib/api-client";
import type {
  ChatSession,
  ChatSessionCreate,
  ChatHistoryResponse,
} from "@/types";

const BASE = "/chat";

export const chatService = {
  createSession: (data: ChatSessionCreate) =>
    apiClient.post<ChatSession>(`${BASE}/sessions`, data),

  getSessionHistory: (sessionId: string) =>
    apiClient.get<ChatHistoryResponse>(`${BASE}/sessions/${sessionId}/history`),

  closeSession: (sessionId: string) =>
    apiClient.post<void>(`${BASE}/sessions/${sessionId}/close`),

  /**
   * SSE streaming endpoint — uses native fetch instead of Axios
   * because Axios doesn't support streaming responses well.
   */
  streamMessage: async function* (
    sessionId: string,
    message: string
  ): AsyncGenerator<string, void, unknown> {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const response = await fetch(`${baseUrl}${BASE}/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              yield parsed.content;
            }
            // Action and done signals handled by the hook
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    }
  },
};
```

---

## 17. Frontend — useChat Hook

### File: `src/hooks/use-chat.ts` (NEW)

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { chatService } from "@/services/chat";
import type { ChatMessage, ChatSession } from "@/types";

interface UseChatOptions {
  eventId?: string;
}

interface UseChatReturn {
  session: ChatSession | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  action: { type: string; event_id?: string } | null;
  sendMessage: (content: string) => Promise<void>;
  initSession: () => Promise<void>;
  clearError: () => void;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: string; event_id?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const initSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const s = await chatService.createSession({
        event_id: options?.eventId || null,
      });
      setSession(s);

      // Load history if session has messages
      if (s.message_count > 0) {
        const history = await chatService.getSessionHistory(s.id);
        setMessages(history.messages);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create chat session");
    } finally {
      setIsLoading(false);
    }
  }, [options?.eventId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session || isStreaming) return;

      // Add user message immediately (optimistic)
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder for assistant response
      const assistantId = `temp-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
      ]);

      setIsStreaming(true);
      setError(null);

      try {
        let fullContent = "";
        for await (const chunk of chatService.streamMessage(session.id, content)) {
          fullContent += chunk;
          const current = fullContent;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            )
          );
        }
      } catch (e: any) {
        setError(e.message || "Failed to get response");
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [session, isStreaming]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    messages,
    isStreaming,
    isLoading,
    error,
    action,
    sendMessage,
    initSession,
    clearError,
  };
}
```

---

## 18. Frontend — ChatWidget Component

### File: `src/components/chat/chat-widget.tsx` (NEW)

A floating chat bubble in the bottom-right corner that expands into a chat panel.

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useChat } from "@/hooks/use-chat";

interface ChatWidgetProps {
  eventId?: string;
}

export function ChatWidget({ eventId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    initSession,
    clearError,
  } = useChat({ eventId });

  useEffect(() => {
    if (isOpen && !isLoading && !messages.length) {
      initSession();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <Card
          variant="elevated"
          className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary p-4 text-primary-foreground">
            <Bot className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">SeatFlow Assistant</p>
              <p className="text-xs opacity-80">Ask about events, tickets, bookings</p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Hi! Ask me anything about this event.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[280px] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content || (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="border-t bg-destructive/10 px-4 py-2 text-xs text-destructive flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about tickets, pricing, timing..."
                disabled={isStreaming || isLoading}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming || isLoading}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
```

---

## 19. Frontend — Integration into Event Page

### File: `src/app/events/[id]/page.tsx` (MODIFY)

Add exactly two lines:

At the top, add the import:
```typescript
import { ChatWidget } from "@/components/chat/chat-widget";
```

Inside the `<Shell>` component, at the very bottom (after the booking panel `</Card>` and before the closing `</div>` and `</Shell>`), add:

```tsx
{/* AI Chat Assistant */}
<ChatWidget eventId={eventId} />
```

This places the floating chat bubble on every event detail page, pre-loaded with that event's context.

---

## 20. Frontend — Admin FAQ Management

### File: `src/app/admin/chat/page.tsx` (NEW)

Admin page to manage knowledge base entries. This is a standard CRUD page following the existing admin page patterns.

The page will:
- List all knowledge entries with category filter
- Allow creating new FAQ entries (question, answer, keywords, category)
- Allow editing existing entries
- Allow toggling `is_active`
- Have a "Seed Default FAQs" button that calls a new admin endpoint

### Backend admin endpoint (add to `seatflow/web/api/admin/views.py`):

```python
# Add these admin endpoints for knowledge base management:

@router.get("/chat/knowledge", summary="List knowledge base entries")
async def list_knowledge_entries(...):
    ...

@router.post("/chat/knowledge", summary="Create knowledge base entry")
async def create_knowledge_entry(...):
    ...

@router.put("/chat/knowledge/{entry_id}", summary="Update knowledge base entry")
async def update_knowledge_entry(...):
    ...

@router.delete("/chat/knowledge/{entry_id}", summary="Delete knowledge base entry")
async def delete_knowledge_entry(...):
    ...

@router.post("/chat/knowledge/seed", summary="Seed default FAQ entries")
async def seed_knowledge_base(...):
    ...
```

---

## 21. Testing Strategy

### Backend Tests

#### File: `backend/tests/test_chat_service.py` (NEW)

```python
"""Tests for chat service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from seatflow.services.chat.chat_service import ChatService
from seatflow.services.chat.context_retriever import ContextRetriever
from seatflow.services.chat.prompt_builder import build_messages
from seatflow.services.chat.llm_provider import MockLLMProvider


@pytest.mark.asyncio
async def test_create_session_returns_new_session():
    """Test that create_session creates a new session when none exists."""
    mock_session = AsyncMock()
    service = ChatService(mock_session)
    # ... test implementation


@pytest.mark.asyncio
async def test_create_session_reuses_existing():
    """Test that create_session reuses an active session if one exists."""
    ...


@pytest.mark.asyncio
async def test_create_session_enforces_daily_limit():
    """Test that daily session limit is enforced."""
    ...


@pytest.mark.asyncio
async def test_process_message_streams_response():
    """Test that process_message yields streaming chunks."""
    ...


@pytest.mark.asyncio
async def test_context_retriever_gets_event_data():
    """Test that context retriever fetches event details."""
    ...


@pytest.mark.asyncio
async def test_context_retriever_searches_knowledge_base():
    """Test keyword search over knowledge entries."""
    ...


def test_prompt_builder_includes_context():
    """Test that built messages include the system prompt + context + history."""
    ...


def test_prompt_builder_limits_history():
    """Test that history is trimmed to max_history_messages."""
    ...


def test_action_extraction():
    """Test that [ACTION] tags are correctly parsed."""
    service = ChatService(AsyncMock())
    action = service._extract_action('Some text [ACTION]{"type": "reserve", "event_id": "abc"}[/ACTION]')
    assert action == {"type": "reserve", "event_id": "abc"}


def test_action_tags_stripped():
    """Test that action tags are removed from displayed text."""
    service = ChatService(AsyncMock())
    clean = service._strip_action_tags('Hello! [ACTION]{"type": "reserve"}[/ACTION]')
    assert clean == "Hello!"


@pytest.mark.asyncio
async def test_mock_provider_streams():
    """Test that MockLLMProvider yields chunks."""
    provider = MockLLMProvider()
    chunks = []
    async for chunk in provider.stream_chat(
        messages=[{"role": "user", "content": "test"}]
    ):
        chunks.append(chunk)
    assert len(chunks) > 0
    assert chunks[-1].done is True
```

#### File: `backend/tests/test_chat_api.py` (NEW)

```python
"""Integration tests for chat API endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/chat/sessions",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_send_message_streams_sse(client: AsyncClient, auth_headers: dict):
    # Create session first
    session_resp = await client.post(
        "/api/v1/chat/sessions",
        json={},
        headers=auth_headers,
    )
    session_id = session_resp.json()["id"]

    # Send message
    response = await client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        json={"message": "Hello", "session_id": session_id},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_unauthenticated_create_session_fails(client: AsyncClient):
    response = await client.post("/api/v1/chat/sessions", json={})
    assert response.status_code == 401
```

### Frontend Tests

No new test framework needed. Test the `useChat` hook with React Testing Library:

```typescript
// src/hooks/__tests__/use-chat.test.ts
// Test: initSession creates session and loads history
// Test: sendMessage appends user message and streams assistant response
// Test: error state is set on API failure
// Test: isStreaming is true during streaming and false after
```

---

## 22. Environment Variables

### Backend `.env.local` additions:

```bash
# AI Chat Assistant
SEATFLOW_CHAT_ENABLED=true
SEATFLOW_CHAT_LLM_PROVIDER=openai       # openai | anthropic | ollama
SEATFLOW_CHAT_LLM_MODEL=gpt-4o-mini     # gpt-4o-mini, gpt-4o, claude-sonnet-4-20250514, llama3.2
SEATFLOW_CHAT_LLM_API_KEY=sk-...        # Your OpenAI/Anthropic API key
SEATFLOW_CHAT_LLM_BASE_URL=https://api.openai.com/v1  # Change for Ollama: http://localhost:11434/v1
SEATFLOW_CHAT_MAX_HISTORY_MESSAGES=10
SEATFLOW_CHAT_MAX_SESSION_MESSAGES=30
SEATFLOW_CHAT_MAX_SESSIONS_PER_DAY=10
SEATFLOW_CHAT_MAX_TOKENS=500
SEATFLOW_CHAT_TEMPERATURE=0.3
```

### Frontend `.env.local` — no changes needed

The SSE endpoint uses the same `NEXT_PUBLIC_API_URL` base URL.

---

## 23. Implementation Order (Step-by-Step)

This is the exact order to implement, with each step being testable independently.

### Phase 1: Backend Foundation (Day 1-2)

| Step | Task | Files |
|------|------|-------|
| 1.1 | Add config fields to `Settings` | `seatflow/config.py` |
| 1.2 | Create DB models | `seatflow/db/models/chat.py` |
| 1.3 | Add `chat_sessions` relationship to User model | `seatflow/db/models/user.py` |
| 1.4 | Run migration | `make migrate MSG="add_chat_tables"` |
| 1.5 | Create DAOs | `seatflow/db/dao/chat_session.py`, `chat_message.py`, `knowledge.py` |

### Phase 2: LLM Provider (Day 2-3)

| Step | Task | Files |
|------|------|-------|
| 2.1 | Install `openai` package | `pyproject.toml` |
| 2.2 | Create LLM provider abstraction | `seatflow/services/chat/llm_provider.py` |
| 2.3 | Test mock provider works | Unit test |

### Phase 3: RAG Pipeline (Day 3-4)

| Step | Task | Files |
|------|------|-------|
| 3.1 | Create context retriever | `seatflow/services/chat/context_retriever.py` |
| 3.2 | Create prompt builder | `seatflow/services/chat/prompt_builder.py` |
| 3.3 | Test context retrieval with real DB data | Integration test |
| 3.4 | Create knowledge base seeder | `seatflow/scripts/seed_knowledge.py` |
| 3.5 | Seed the knowledge base | Run script |

### Phase 4: Chat Service + API (Day 4-5)

| Step | Task | Files |
|------|------|-------|
| 4.1 | Create chat service | `seatflow/services/chat/chat_service.py` |
| 4.2 | Create API schemas | `seatflow/web/api/chat/schema.py` |
| 4.3 | Create API views (SSE endpoint) | `seatflow/web/api/chat/views.py` |
| 4.4 | Register router | `seatflow/web/api/router.py` |
| 4.5 | Test SSE endpoint with curl | Manual test |
| 4.6 | Create cleanup task | `seatflow/tasks/chat_tasks.py` |

### Phase 5: Frontend (Day 5-7)

| Step | Task | Files |
|------|------|-------|
| 5.1 | Add TypeScript types | `src/types/index.ts` |
| 5.2 | Create chat API service | `src/services/chat.ts` |
| 5.3 | Create useChat hook | `src/hooks/use-chat.ts` |
| 5.4 | Create ChatWidget component | `src/components/chat/chat-widget.tsx` |
| 5.5 | Integrate into event page | `src/app/events/[id]/page.tsx` |
| 5.6 | Test full flow in browser | Manual test |

### Phase 6: Admin + Polish (Day 7-8)

| Step | Task | Files |
|------|------|-------|
| 6.1 | Add admin knowledge endpoints | `seatflow/web/api/admin/views.py` |
| 6.2 | Create admin FAQ management page | `src/app/admin/chat/page.tsx` |
| 6.3 | Add admin chat sidebar link | `src/components/layout/admin-sidebar.tsx` |
| 6.4 | Write backend tests | `tests/test_chat_service.py`, `tests/test_chat_api.py` |
| 6.5 | Load test SSE endpoint | Locust scenario |

---

## Complete File Tree (New and Modified)

```
backend/
├── seatflow/
│   ├── config.py                                    # MODIFY — add chat_* settings
│   ├── scripts/
│   │   └── seed_knowledge.py                        # NEW — seed FAQ data
│   ├── db/
│   │   ├── models/
│   │   │   ├── chat.py                              # NEW — ChatSession, ChatMessage, KnowledgeEntry
│   │   │   └── user.py                              # MODIFY — add chat_sessions relationship
│   │   ├── dao/
│   │   │   ├── chat_session.py                      # NEW
│   │   │   ├── chat_message.py                      # NEW
│   │   │   └── knowledge.py                         # NEW
│   │   └── migrations/versions/
│   │       └── xxxx_add_chat_tables.py              # AUTO-GENERATED
│   ├── services/
│   │   └── chat/
│   │       ├── __init__.py                          # NEW
│   │       ├── chat_service.py                      # NEW — main service
│   │       ├── context_retriever.py                 # NEW — RAG context gathering
│   │       ├── prompt_builder.py                    # NEW — prompt construction
│   │       └── llm_provider.py                      # NEW — LLM abstraction
│   ├── tasks/
│   │   └── chat_tasks.py                            # NEW — session cleanup
│   └── web/
│       └── api/
│           ├── router.py                            # MODIFY — add chat router
│           ├── chat/
│           │   ├── __init__.py                      # NEW
│           │   ├── views.py                         # NEW — SSE endpoint + CRUD
│           │   └── schema.py                        # NEW — request/response schemas
│           └── admin/
│               └── views.py                         # MODIFY — add knowledge endpoints
└── tests/
    ├── test_chat_service.py                         # NEW
    └── test_chat_api.py                             # NEW

frontend/
├── src/
│   ├── types/
│   │   └── index.ts                                 # MODIFY — add Chat* types
│   ├── services/
│   │   └── chat.ts                                  # NEW — chat API service
│   ├── hooks/
│   │   └── use-chat.ts                              # NEW — chat state management
│   ├── components/
│   │   └── chat/
│   │       └── chat-widget.tsx                      # NEW — floating chat UI
│   ├── app/
│   │   ├── events/[id]/
│   │   │   └── page.tsx                             # MODIFY — add <ChatWidget />
│   │   └── admin/
│   │       └── chat/
│   │           └── page.tsx                         # NEW — FAQ management
│   └── components/layout/
│       └── admin-sidebar.tsx                        # MODIFY — add Chat link
```

**Total: 16 new files, 6 modified files. Estimated effort: 7-8 days.**
