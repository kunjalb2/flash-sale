from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.models.chat import ChatMessage


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
        stmt = select(func.count()).where(ChatMessage.session_id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0