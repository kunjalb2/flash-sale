from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from seatflow.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from seatflow.db.models.booking import Booking
    from seatflow.db.models.ticket import Ticket


class Event(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "events"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=True)
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sale_start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sale_end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_tickets: Mapped[int] = mapped_column(nullable=False)
    available_tickets: Mapped[int] = mapped_column(nullable=False)
    price_per_ticket: Mapped[float] = mapped_column(nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="event", lazy="selectin")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="event", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Event {self.title}>"
