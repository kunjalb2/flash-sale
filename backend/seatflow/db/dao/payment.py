from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from seatflow.db.dependencies import get_db_session
from seatflow.db.models.payment import Payment, PaymentStatus


class PaymentDAO:
    """Class for accessing payment table."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self.session = session

    async def create(self, payment_data: dict[str, Any]) -> Payment:
        payment = Payment(**payment_data)
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    async def get_by_id(self, payment_id: UUID) -> Payment | None:
        stmt = select(Payment).where(Payment.id == payment_id).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_booking_id(self, booking_id: UUID) -> Payment | None:
        stmt = select(Payment).where(Payment.booking_id == booking_id).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_stripe_session_id(self, stripe_session_id: str) -> Payment | None:
        stmt = select(Payment).where(Payment.stripe_checkout_session_id == stripe_session_id).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_payment_intent_id(self, payment_intent_id: str) -> Payment | None:
        stmt = select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Payment | None:
        stmt = select(Payment).where(Payment.idempotency_key == idempotency_key).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def update(self, payment: Payment, update_data: dict[str, Any]) -> Payment:
        for field, value in update_data.items():
            setattr(payment, field, value)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    async def get_pending_payments(self, before_time: datetime, limit: int = 100) -> list[Payment]:
        stmt = select(Payment).where(and_(Payment.status == PaymentStatus.pending, Payment.created_at < before_time)).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        ).order_by(Payment.created_at.asc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    async def list_payments(
        self, offset: int = 0, limit: int = 20, status: PaymentStatus | None = None,
        payment_method: str | None = None, date_from: datetime | None = None, date_to: datetime | None = None,
    ) -> tuple[list[Payment], int]:
        conditions = []
        if status:
            conditions.append(Payment.status == status)
        if payment_method:
            conditions.append(Payment.payment_method == payment_method)
        if date_from:
            conditions.append(Payment.created_at >= date_from)
        if date_to:
            conditions.append(Payment.created_at <= date_to)
        query = select(Payment)
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Payment.created_at.desc())
        total = (await self.session.execute(select(func.count()).select_from(query.subquery()))).scalar()
        stmt = query.options(selectinload(Payment.booking), selectinload(Payment.user)).offset(offset).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all()), total

    async def get_by_user_id(self, user_id: UUID) -> list[Payment]:
        stmt = select(Payment).where(Payment.user_id == user_id).options(
            selectinload(Payment.booking), selectinload(Payment.user),
        ).order_by(Payment.created_at.desc())
        return list((await self.session.execute(stmt)).scalars().all())
