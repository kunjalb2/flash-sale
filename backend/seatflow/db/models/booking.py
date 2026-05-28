import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from seatflow.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from seatflow.db.models.event import Event
    from seatflow.db.models.payment import Payment
    from seatflow.db.models.user import User


class BookingStatus(str, enum.Enum):
    reserved = "reserved"
    confirmed = "confirmed"
    cancelled = "cancelled"
    expired = "expired"


class Booking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bookings"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id"), nullable=False, index=True)
    ticket_count: Mapped[int] = mapped_column(nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus), default=BookingStatus.reserved, nullable=False
    )
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="bookings")
    event: Mapped["Event"] = relationship(back_populates="bookings")
    payment: Mapped["Payment"] = relationship(
        back_populates="booking", uselist=False, lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Booking {self.id} - {self.status}>"
