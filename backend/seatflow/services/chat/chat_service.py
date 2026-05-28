import json
import re
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from typing import Any
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
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.session_repo = ChatSessionDAO(session)
        self.message_repo = ChatMessageDAO(session)

    async def create_session(
        self, user_id: UUID, event_id: UUID | None = None
    ) -> dict[str, Any]:
        sessions_today = await self.session_repo.count_sessions_today(user_id)
        if sessions_today >= settings.chat_max_sessions_per_day:
            raise RateLimitException(
                detail=f"Daily chat session limit reached ({settings.chat_max_sessions_per_day})"
            )

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
        chat_session = await self.session_repo.get_by_id(session_id)
        if not chat_session:
            raise BadRequestException(detail="Chat session not found")

        if chat_session.user_id != user_id:
            raise BadRequestException(detail="Not your chat session")

        if chat_session.status != ChatSessionStatus.active:
            raise BadRequestException(detail="Chat session is closed")

        message_count = await self.message_repo.count_by_session(session_id)
        if message_count >= settings.chat_max_session_messages:
            raise RateLimitException(
                detail=f"Session message limit reached ({settings.chat_max_session_messages})"
            )

        await self.message_repo.create({
            "session_id": session_id,
            "role": ChatMessageRole.user,
            "content": message,
            "tokens_used": 0,
        })

        context_retriever = ContextRetriever(self.session)
        context, sources = await context_retriever.retrieve(
            user_message=message,
            event_id=chat_session.event_id,
        )

        recent_messages = await self.session_repo.get_recent_messages(
            session_id,
            limit=settings.chat_max_history_messages,
        )
        history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in recent_messages
            if msg.role != ChatMessageRole.system
        ]

        messages = build_messages(
            user_message=message,
            context=context,
            history=history,
        )

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

            action = self._extract_action(full_response)
            clean_response = self._strip_action_tags(full_response)

            await self.message_repo.create({
                "session_id": session_id,
                "role": ChatMessageRole.assistant,
                "content": clean_response,
                "tokens_used": total_tokens,
                "context_sources": json.dumps(sources),
            })

            await self.session_repo.increment_message_count(session_id)

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

    async def get_history(self, session_id: UUID, user_id: UUID) -> list[dict[str, Any]]:
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
        chat_session = await self.session_repo.get_by_id(session_id)
        if not chat_session:
            raise BadRequestException(detail="Chat session not found")

        if chat_session.user_id != user_id:
            raise BadRequestException(detail="Not your chat session")

        await self.session_repo.close_session(session_id)

    def _extract_action(self, text: str) -> dict[str, Any] | None:
        match = re.search(r"\[ACTION\](.*?)\[/ACTION\]", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                return None
        return None

    def _strip_action_tags(self, text: str) -> str:
        return re.sub(r"\[ACTION\].*?\[/ACTION\]", "", text, flags=re.DOTALL).strip()