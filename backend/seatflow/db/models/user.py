from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from seatflow.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from seatflow.db.models.booking import Booking
    from seatflow.db.models.payment import Payment
    from seatflow.db.models.chat import ChatSession


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="user", lazy="selectin")
    payments: Mapped[list["Payment"]] = relationship(back_populates="user", lazy="selectin")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
