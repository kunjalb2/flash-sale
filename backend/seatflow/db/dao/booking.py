from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from seatflow.db.dependencies import get_db_session
from seatflow.db.models.booking import Booking, BookingStatus


class BookingDAO:
    """Class for accessing booking table."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self.session = session

    async def create(self, booking_data: dict[str, Any]) -> Booking:
        booking = Booking(**booking_data)
        self.session.add(booking)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking

    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id).options(
            selectinload(Booking.user), selectinload(Booking.event), selectinload(Booking.payment),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_user_bookings(
        self, user_id: UUID, status: BookingStatus | None = None, offset: int = 0, limit: int = 20,
    ) -> tuple[list[Booking], int]:
        conditions = [Booking.user_id == user_id]
        if status:
            conditions.append(Booking.status == status)
        query = select(Booking).where(and_(*conditions)).order_by(Booking.created_at.desc())
        total = (await self.session.execute(select(func.count()).select_from(query.subquery()))).scalar()
        stmt = query.options(selectinload(Booking.event)).offset(offset).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def update(self, booking: Booking, update_data: dict[str, Any]) -> Booking:
        for field, value in update_data.items():
            setattr(booking, field, value)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking

    async def expire_reservations(self, before_time: datetime) -> int:
        stmt = select(Booking).where(and_(Booking.status == BookingStatus.reserved, Booking.expires_at < before_time)).with_for_update()
        bookings = list((await self.session.execute(stmt)).scalars().all())
        for booking in bookings:
            booking.status = BookingStatus.expired
        await self.session.flush()
        return len(bookings)

    async def get_active_reservation(self, user_id: UUID, event_id: UUID) -> Booking | None:
        stmt = select(Booking).where(and_(
            Booking.user_id == user_id, Booking.event_id == event_id,
            Booking.status == BookingStatus.reserved, Booking.expires_at > datetime.now(timezone.utc),
        ))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_bookings_before(self, before_time: datetime, limit: int = 100) -> tuple[list[Booking], int]:
        stmt = select(Booking).where(Booking.created_at < before_time).order_by(Booking.created_at.asc()).limit(limit)
        bookings = list((await self.session.execute(stmt)).scalars().all())
        return bookings, len(bookings)

    async def delete(self, booking: Booking) -> None:
        await self.session.delete(booking)

    async def list_all_bookings(
        self, offset: int = 0, limit: int = 20, status: BookingStatus | None = None,
        event_id: UUID | None = None, user_id: UUID | None = None,
        date_from: datetime | None = None, date_to: datetime | None = None,
    ) -> tuple[list[Booking], int]:
        conditions = []
        if status:
            conditions.append(Booking.status == status)
        if event_id:
            conditions.append(Booking.event_id == event_id)
        if user_id:
            conditions.append(Booking.user_id == user_id)
        if date_from:
            conditions.append(Booking.created_at >= date_from)
        if date_to:
            conditions.append(Booking.created_at <= date_to)
        query = select(Booking)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Booking.created_at.desc())
        total = (await self.session.execute(select(func.count()).select_from(query.subquery()))).scalar()
        stmt = query.options(selectinload(Booking.user), selectinload(Booking.event), selectinload(Booking.payment)).offset(offset).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all()), total
