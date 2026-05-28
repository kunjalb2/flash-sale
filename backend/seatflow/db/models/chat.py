import enum
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
    context_sources: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

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
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:
        return f"<KnowledgeEntry {self.id} - {self.category}>"