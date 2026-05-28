import secrets
import string
from datetime import datetime, timedelta, timezone
from math import ceil
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from seatflow.core.exceptions import BadRequestException, NotFoundException
from seatflow.db.models.booking import Booking, BookingStatus
from seatflow.db.models.event import Event
from seatflow.db.models.payment import Payment, PaymentStatus
from seatflow.db.models.ticket import Ticket, TicketStatus
from seatflow.db.models.user import User
from seatflow.db.dao.booking import BookingDAO
from seatflow.db.dao.payment import PaymentDAO
from seatflow.db.dao.ticket import TicketDAO
from seatflow.db.dao.user import UserDAO
from seatflow.web.api.admin.schema import (
    AdminBookingDetailResponse,
    AdminBookingListResponse,
    AdminBookingResponse,
    AdminPaymentListResponse,
    AdminPaymentResponse,
    AdminUserCreate,
    AdminUserCreateResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserResponse,
    AdminUserUpdate,
    DashboardStats,
    EventPerformance,
    EventPerformanceResponse,
    RecentActivityItem,
    RecentActivityResponse,
    RevenueDataPoint,
    RevenueResponse,
    TicketBatchCreate,
    TicketUpdate,
)
from sqlalchemy import select


class AdminService:
    """Service for admin operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserDAO(session)
        self.booking_repo = BookingDAO(session)
        self.payment_repo = PaymentDAO(session)
        self.ticket_repo = TicketDAO(session)

    # --- Users ---

    async def create_user(self, user_data: AdminUserCreate) -> AdminUserCreateResponse:
        existing_user = await self.user_repo.get_by_email(user_data.email)
        if existing_user:
            raise BadRequestException("User with this email already exists")

        password = user_data.password or self._generate_password()
        user = await self.user_repo.create(
            email=user_data.email,
            full_name=user_data.full_name,
            password=password,
            is_superuser=user_data.is_superuser,
        )

        return AdminUserCreateResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            booking_count=0,
            total_spent=0.0,
            created_at=user.created_at,
            updated_at=user.updated_at,
            generated_password=None if user_data.password else password,
        )

    def _generate_password(self, length: int = 16) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    async def list_users(
        self,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        is_active: bool | None = None,
        is_superuser: bool | None = None,
    ) -> AdminUserListResponse:
        offset = (page - 1) * size
        users, total = await self.user_repo.list_users(
            offset=offset,
            limit=size,
            search=search,
            is_active=is_active,
            is_superuser=is_superuser,
        )

        items = []
        for user in users:
            booking_count = len(user.bookings) if user.bookings else 0
            total_spent = (
                sum(
                    float(b.total_amount)
                    for b in user.bookings
                    if b.status in (BookingStatus.confirmed,)
                )
                if user.bookings
                else 0.0
            )

            items.append(
                AdminUserResponse(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                    booking_count=booking_count,
                    total_spent=total_spent,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                )
            )

        return AdminUserListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=ceil(total / size) if total else 0,
        )

    async def get_user_detail(self, user_id: UUID) -> AdminUserDetailResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        booking_count = len(user.bookings) if user.bookings else 0
        total_spent = (
            sum(float(b.total_amount) for b in user.bookings if b.status == BookingStatus.confirmed)
            if user.bookings
            else 0.0
        )

        recent_bookings = []
        if user.bookings:
            sorted_bookings = sorted(user.bookings, key=lambda b: b.created_at, reverse=True)[:5]
            recent_bookings = [
                {
                    "id": str(b.id),
                    "event_id": str(b.event_id),
                    "ticket_count": b.ticket_count,
                    "total_amount": float(b.total_amount),
                    "status": b.status.value,
                    "created_at": b.created_at.isoformat(),
                }
                for b in sorted_bookings
            ]

        recent_payments = []
        if user.payments:
            sorted_payments = sorted(user.payments, key=lambda p: p.created_at, reverse=True)[:5]
            recent_payments = [
                {
                    "id": str(p.id),
                    "amount": float(p.amount),
                    "status": p.status.value,
                    "created_at": p.created_at.isoformat(),
                }
                for p in sorted_payments
            ]

        return AdminUserDetailResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            booking_count=booking_count,
            total_spent=total_spent,
            created_at=user.created_at,
            updated_at=user.updated_at,
            recent_bookings=recent_bookings,
            recent_payments=recent_payments,
        )

    async def update_user(self, user_id: UUID, update_data: AdminUserUpdate) -> AdminUserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            raise BadRequestException("No fields to update")

        user = await self.user_repo.update(user, update_dict)

        booking_count = len(user.bookings) if user.bookings else 0
        total_spent = (
            sum(float(b.total_amount) for b in user.bookings if b.status == BookingStatus.confirmed)
            if user.bookings
            else 0.0
        )

        return AdminUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            booking_count=booking_count,
            total_spent=total_spent,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def soft_delete_user(self, user_id: UUID) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")

        await self.user_repo.update(user, {"is_active": False})

    # --- Bookings ---

    async def list_bookings(
        self,
        page: int = 1,
        size: int = 20,
        status: BookingStatus | None = None,
        event_id: UUID | None = None,
        user_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> AdminBookingListResponse:
        offset = (page - 1) * size
        bookings, total = await self.booking_repo.list_all_bookings(
            offset=offset,
            limit=size,
            status=status,
            event_id=event_id,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
        )

        items = []
        for b in bookings:
            items.append(
                AdminBookingResponse(
                    id=b.id,
                    user_id=b.user_id,
                    event_id=b.event_id,
                    ticket_count=b.ticket_count,
                    total_amount=float(b.total_amount),
                    status=b.status.value,
                    reserved_at=b.reserved_at,
                    expires_at=b.expires_at,
                    created_at=b.created_at,
                    updated_at=b.updated_at,
                    user_email=b.user.email if b.user else None,
                    event_title=b.event.title if b.event else None,
                    payment_status=b.payment.status.value if b.payment else None,
                )
            )

        return AdminBookingListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=ceil(total / size) if total else 0,
        )

    async def get_booking_detail(self, booking_id: UUID) -> AdminBookingDetailResponse:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException("Booking not found")

        user_info = None
        if booking.user:
            user_info = {
                "email": booking.user.email,
                "full_name": booking.user.full_name,
            }

        event_info = None
        if booking.event:
            event_info = {
                "title": booking.event.title,
                "venue": booking.event.venue,
                "event_date": booking.event.event_date.isoformat(),
            }

        payment_info = None
        if booking.payment:
            payment_info = {
                "id": str(booking.payment.id),
                "amount": float(booking.payment.amount),
                "status": booking.payment.status.value,
                "method": booking.payment.payment_method.value,
            }

        return AdminBookingDetailResponse(
            id=booking.id,
            user_id=booking.user_id,
            event_id=booking.event_id,
            ticket_count=booking.ticket_count,
            total_amount=float(booking.total_amount),
            status=booking.status.value,
            reserved_at=booking.reserved_at,
            expires_at=booking.expires_at,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            user_email=booking.user.email if booking.user else None,
            event_title=booking.event.title if booking.event else None,
            payment_status=booking.payment.status.value if booking.payment else None,
            user_info=user_info,
            event_info=event_info,
            payment_info=payment_info,
        )

    async def cancel_booking(self, booking_id: UUID) -> None:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException("Booking not found")

        if booking.status not in (BookingStatus.reserved, BookingStatus.confirmed):
            raise BadRequestException("Only reserved or confirmed bookings can be cancelled")

        await self.booking_repo.update(
            booking,
            {
                "status": BookingStatus.cancelled,
                "expires_at": None,
            },
        )

    async def refund_booking(self, booking_id: UUID) -> None:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise NotFoundException("Booking not found")

        if booking.status != BookingStatus.confirmed:
            raise BadRequestException("Only confirmed bookings can be refunded")

        if booking.payment and booking.payment.status == PaymentStatus.succeeded:
            await self.payment_repo.update(
                booking.payment,
                {
                    "status": PaymentStatus.refund_pending,
                },
            )

        await self.booking_repo.update(booking, {"status": BookingStatus.cancelled})

    # --- Payments ---

    async def list_payments(
        self,
        page: int = 1,
        size: int = 20,
        status: PaymentStatus | None = None,
        payment_method: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> AdminPaymentListResponse:
        offset = (page - 1) * size
        payments, total = await self.payment_repo.list_payments(
            offset=offset,
            limit=size,
            status=status,
            payment_method=payment_method,
            date_from=date_from,
            date_to=date_to,
        )

        items = []
        for p in payments:
            event_title = None
            if p.booking and p.booking.event:
                event_title = p.booking.event.title

            items.append(
                AdminPaymentResponse(
                    id=p.id,
                    booking_id=p.booking_id,
                    user_id=p.user_id,
                    amount=float(p.amount),
                    currency=p.currency,
                    status=p.status.value,
                    payment_method=p.payment_method.value,
                    stripe_receipt_url=p.stripe_receipt_url,
                    paid_at=p.paid_at,
                    refunded_at=p.refunded_at,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    user_email=p.user.email if p.user else None,
                    event_title=event_title,
                )
            )

        return AdminPaymentListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=ceil(total / size) if total else 0,
        )

    async def get_payment_detail(self, payment_id: UUID) -> AdminPaymentResponse:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise NotFoundException("Payment not found")

        event_title = None
        if payment.booking and hasattr(payment.booking, "event"):
            event_title = payment.booking.event.title if payment.booking.event else None

        return AdminPaymentResponse(
            id=payment.id,
            booking_id=payment.booking_id,
            user_id=payment.user_id,
            amount=float(payment.amount),
            currency=payment.currency,
            status=payment.status.value,
            payment_method=payment.payment_method.value,
            stripe_receipt_url=payment.stripe_receipt_url,
            paid_at=payment.paid_at,
            refunded_at=payment.refunded_at,
            created_at=payment.created_at,
            updated_at=payment.updated_at,
            user_email=payment.user.email if payment.user else None,
            event_title=event_title,
        )

    # --- Dashboard ---

    async def get_dashboard_stats(self) -> DashboardStats:
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        total_users = (await self.session.execute(select(func.count(User.id)))).scalar() or 0

        total_events = (await self.session.execute(select(func.count(Event.id)))).scalar() or 0

        active_events = (
            await self.session.execute(select(func.count(Event.id)).where(Event.is_active == True))
        ).scalar() or 0

        total_bookings = (await self.session.execute(select(func.count(Booking.id)))).scalar() or 0

        confirmed_bookings = (
            await self.session.execute(
                select(func.count(Booking.id)).where(Booking.status == BookingStatus.confirmed)
            )
        ).scalar() or 0

        pending_bookings = (
            await self.session.execute(
                select(func.count(Booking.id)).where(Booking.status == BookingStatus.reserved)
            )
        ).scalar() or 0

        cancelled_bookings = (
            await self.session.execute(
                select(func.count(Booking.id)).where(Booking.status == BookingStatus.cancelled)
            )
        ).scalar() or 0

        total_revenue = float(
            (
                await self.session.execute(
                    select(func.sum(Payment.amount)).where(
                        Payment.status == PaymentStatus.succeeded
                    )
                )
            ).scalar()
            or 0
        )

        recent_bookings_count = (
            await self.session.execute(
                select(func.count(Booking.id)).where(Booking.created_at >= yesterday)
            )
        ).scalar() or 0

        recent_users_count = (
            await self.session.execute(
                select(func.count(User.id)).where(User.created_at >= yesterday)
            )
        ).scalar() or 0

        return DashboardStats(
            total_users=total_users,
            total_events=total_events,
            total_bookings=total_bookings,
            total_revenue=total_revenue,
            active_events=active_events,
            confirmed_bookings=confirmed_bookings,
            pending_bookings=pending_bookings,
            cancelled_bookings=cancelled_bookings,
            recent_bookings_count=recent_bookings_count,
            recent_users_count=recent_users_count,
        )

    async def get_revenue(
        self,
        period: str = "daily",
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> RevenueResponse:
        now = datetime.now(timezone.utc)
        if not start_date:
            start_date = now - timedelta(days=30)
        if not end_date:
            end_date = now

        trunc_map = {"daily": "day", "weekly": "week", "monthly": "month"}
        trunc_unit = trunc_map.get(period, "day")

        stmt = (
            select(
                func.date_trunc(trunc_unit, Payment.created_at).label("date"),
                func.sum(Payment.amount).label("revenue"),
                func.count(Booking.id).label("booking_count"),
            )
            .join(Booking, Payment.booking_id == Booking.id)
            .where(
                and_(
                    Payment.status == PaymentStatus.succeeded,
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date,
                )
            )
            .group_by(func.date_trunc(trunc_unit, Payment.created_at))
            .order_by(func.date_trunc(trunc_unit, Payment.created_at))
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        data = [
            RevenueDataPoint(
                date=row.date.isoformat() if row.date else "",
                revenue=float(row.revenue or 0),
                booking_count=row.booking_count or 0,
            )
            for row in rows
        ]

        total = sum(d.revenue for d in data)

        return RevenueResponse(period=period, data=data, total=total)

    async def get_events_performance(self, limit: int = 10) -> EventPerformanceResponse:
        stmt = (
            select(
                Event.id,
                Event.title,
                Event.venue,
                Event.event_date,
                Event.total_tickets,
                Event.available_tickets,
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("revenue"),
            )
            .outerjoin(
                Booking,
                and_(Event.id == Booking.event_id, Booking.status == BookingStatus.confirmed),
            )
            .where(Event.is_active == True)
            .group_by(Event.id)
            .order_by(func.sum(Booking.total_amount).desc().nullslast())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        items = [
            EventPerformance(
                event_id=row.id,
                title=row.title,
                venue=row.venue,
                event_date=row.event_date,
                total_tickets=row.total_tickets,
                sold_tickets=row.total_tickets - row.available_tickets,
                available_tickets=row.available_tickets,
                revenue=float(row.revenue or 0),
                booking_count=row.booking_count or 0,
            )
            for row in rows
        ]

        return EventPerformanceResponse(items=items)

    async def get_recent_activity(self, limit: int = 20) -> RecentActivityResponse:
        activities: list[RecentActivityItem] = []

        # Recent bookings
        booking_stmt = (
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.event))
            .order_by(Booking.created_at.desc())
            .limit(limit)
        )
        booking_result = await self.session.execute(booking_stmt)
        for b in booking_result.scalars().all():
            activities.append(
                RecentActivityItem(
                    id=b.id,
                    type="booking",
                    description=f"Booking by {b.user.email if b.user else 'Unknown'} for {b.event.title if b.event else 'Unknown'}",
                    amount=float(b.total_amount),
                    created_at=b.created_at,
                )
            )

        # Recent registrations
        user_stmt = select(User).order_by(User.created_at.desc()).limit(limit)
        user_result = await self.session.execute(user_stmt)
        for u in user_result.scalars().all():
            activities.append(
                RecentActivityItem(
                    id=u.id,
                    type="registration",
                    description=f"New user registered: {u.email}",
                    amount=None,
                    created_at=u.created_at,
                )
            )

        # Recent successful payments
        payment_stmt = (
            select(Payment)
            .options(selectinload(Payment.user))
            .where(Payment.status == PaymentStatus.succeeded)
            .order_by(Payment.created_at.desc())
            .limit(limit)
        )
        payment_result = await self.session.execute(payment_stmt)
        for p in payment_result.scalars().all():
            activities.append(
                RecentActivityItem(
                    id=p.id,
                    type="payment",
                    description=f"Payment of ${float(p.amount):.2f} by {p.user.email if p.user else 'Unknown'}",
                    amount=float(p.amount),
                    created_at=p.created_at,
                )
            )

        activities.sort(key=lambda a: a.created_at, reverse=True)
        activities = activities[:limit]

        return RecentActivityResponse(items=activities, total=len(activities))

    # --- Tickets ---

    async def batch_create_tickets(self, event_id: UUID, batch_data: TicketBatchCreate) -> dict:
        # Verify event exists
        event_stmt = select(Event).where(Event.id == event_id)
        event_result = await self.session.execute(event_stmt)
        event = event_result.scalar_one_or_none()
        if not event:
            raise NotFoundException("Event not found")

        default_price = batch_data.default_price or event.price_per_ticket
        default_seat_type = batch_data.default_seat_type or "general"

        tickets_data = []
        for item in batch_data.tickets:
            tickets_data.append(
                {
                    "event_id": event_id,
                    "seat_number": item.seat_number,
                    "section": item.section,
                    "row": item.row,
                    "price": item.price or default_price,
                    "seat_type": item.seat_type or default_seat_type,
                    "notes": item.notes,
                    "status": TicketStatus.available.value,
                }
            )

        tickets = await self.ticket_repo.create_batch(tickets_data)

        # Update event ticket counts
        new_total = event.total_tickets + len(tickets)
        new_available = event.available_tickets + len(tickets)
        event.total_tickets = new_total
        event.available_tickets = new_available
        await self.session.flush()

        return {
            "created": len(tickets),
            "total_tickets": new_total,
            "available_tickets": new_available,
        }

    async def update_ticket(self, ticket_id: UUID, update_data: TicketUpdate) -> dict:
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            raise NotFoundException("Ticket not found")

        update_dict = update_data.model_dump(exclude_unset=True)
        if not update_dict:
            raise BadRequestException("No fields to update")

        for field, value in update_dict.items():
            setattr(ticket, field, value)

        await self.session.flush()
        await self.session.refresh(ticket)

        return {
            "id": str(ticket.id),
            "seat_number": ticket.seat_number,
            "price": float(ticket.price),
            "section": ticket.section,
            "status": ticket.status.value,
        }

    async def delete_ticket(self, ticket_id: UUID) -> None:
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            raise NotFoundException("Ticket not found")

        if ticket.status != TicketStatus.available:
            raise BadRequestException("Only available tickets can be deleted")

        # Update event counts
        event_stmt = select(Event).where(Event.id == ticket.event_id)
        event_result = await self.session.execute(event_stmt)
        event = event_result.scalar_one_or_none()

        await self.ticket_repo.delete(ticket)

        if event:
            event.total_tickets -= 1
            event.available_tickets -= 1
            await self.session.flush()
