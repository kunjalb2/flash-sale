import json
import time
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

router = APIRouter(tags=["Chat"])


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
    chat_service = ChatService(db_session)
    await chat_service.close_session(session_id, current_user.id)