from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import (
    ChatMessage,
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
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = list(result.scalars().all())
        messages.reverse()
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