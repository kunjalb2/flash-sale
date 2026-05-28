import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from seatflow.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from seatflow.db.models.event import Event


class TicketStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    sold = "sold"
    cancelled = "cancelled"


class SeatType(str, enum.Enum):
    general = "general"
    vip = "vip"
    premium = "premium"


class Ticket(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tickets"

    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"), nullable=False, index=True)
    seat_number: Mapped[str] = mapped_column(String(50), nullable=False)
    section: Mapped[str | None] = mapped_column(String(100), nullable=True)
    row: Mapped[str | None] = mapped_column(String(20), nullable=True)
    seat_type: Mapped[SeatType] = mapped_column(
        SQLEnum(SeatType), default=SeatType.general, nullable=False
    )
    price: Mapped[float] = mapped_column(nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        SQLEnum(TicketStatus), default=TicketStatus.available, nullable=False, index=True
    )
    reserved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reserved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    event: Mapped["Event"] = relationship(back_populates="tickets")

    __table_args__ = (
        Index(
            "uq_ticket_event_seat_active",
            "event_id",
            "seat_number",
            unique=True,
            postgresql_where=status.in_([TicketStatus.available, TicketStatus.reserved]),
        ),
        {"comment": "Individual tickets for events with seat assignments"},
    )

    def __repr__(self) -> str:
        return f"<Ticket {self.seat_number} - {self.status}>"
