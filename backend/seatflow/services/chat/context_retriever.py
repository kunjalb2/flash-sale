from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.config import settings
from seatflow.db.dao.event import EventDAO
from seatflow.db.dao.ticket import TicketDAO
from seatflow.db.dao.knowledge import KnowledgeEntryDAO
from seatflow.core.logging.service_logger import ServiceLogger


class ContextRetriever:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.event_repo = EventDAO(session)
        self.ticket_repo = TicketDAO(session)
        self.knowledge_repo = KnowledgeEntryDAO(session)

    async def retrieve(
        self,
        user_message: str,
        event_id: UUID | None = None,
    ) -> tuple[str, list[str]]:
        sections: list[str] = []
        sources: list[str] = []

        if event_id:
            event_context = await self._get_event_context(event_id)
            if event_context:
                sections.append(event_context)
                sources.append("event_data")

            ticket_context = await self._get_ticket_context(event_id)
            if ticket_context:
                sections.append(ticket_context)
                sources.append("ticket_availability")

        kb_context = await self._get_knowledge_context(user_message)
        if kb_context:
            sections.append(kb_context)
            sources.append("knowledge_base")

        policy_context = self._get_static_policies()
        sections.append(policy_context)
        sources.append("booking_policies")

        context_text = "\n\n---\n\n".join(sections)
        return context_text, sources

    async def _get_event_context(self, event_id: UUID) -> str | None:
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            return None

        return (
            f"## Current Event Details\n"
            f"- Title: {event.title}\n"
            f"- Venue: {event.venue}\n"
            f"- Event Date: {event.event_date.isoformat()}\n"
            f"- Sale Period: {event.sale_start_date.isoformat()} to {event.sale_end_date.isoformat()}\n"
            f"- Total Tickets: {event.total_tickets}\n"
            f"- Available Tickets: {event.available_tickets}\n"
            f"- Price Per Ticket: ${event.price_per_ticket:.2f}\n"
            f"- Active: {event.is_active}\n"
            f"- Sold Out: {event.available_tickets == 0}\n"
        )

    async def _get_ticket_context(self, event_id: UUID) -> str | None:
        try:
            from sqlalchemy import func
            from seatflow.db.models.ticket import Ticket, TicketStatus

            stmt = (
                select(Ticket.status, func.count(Ticket.id))
                .where(Ticket.event_id == event_id)
                .group_by(Ticket.status)
            )
            result = await self.session.execute(stmt)
            status_counts = dict(result.all())

            available = status_counts.get(TicketStatus.available, 0)
            reserved = status_counts.get(TicketStatus.reserved, 0)
            sold = status_counts.get(TicketStatus.sold, 0)

            section_stmt = (
                select(Ticket.section, Ticket.seat_type, func.count(Ticket.id))
                .where(Ticket.event_id == event_id, Ticket.status == TicketStatus.available)
                .group_by(Ticket.section, Ticket.seat_type)
            )
            section_result = await self.session.execute(section_stmt)
            sections = list(section_result.all())

            section_details = "\n".join(
                f"  - Section {s or 'General'} ({t or 'general'}): {c} available"
                for s, t, c in sections
            )

            return (
                f"## Ticket Availability\n"
                f"- Available: {available}\n"
                f"- Reserved (held): {reserved}\n"
                f"- Sold: {sold}\n"
                f"- Breakdown by section:\n{section_details}\n"
            )
        except Exception as e:
            ServiceLogger.log(
                service="ContextRetriever",
                operation="get_ticket_context",
                error=str(e),
                level="warning",
            )
            return None

    async def _get_knowledge_context(self, query: str) -> str | None:
        entries = await self.knowledge_repo.search(query, limit=3)
        if not entries:
            return None

        faq_text = "## Frequently Asked Questions\n"
        for entry in entries:
            faq_text += f"**Q: {entry.question}**\nA: {entry.answer}\n\n"

        return faq_text

    def _get_static_policies(self) -> str:
        return (
            "## Booking & Payment Policies\n"
            f"- Reservation hold time: {settings.reservation_timeout_seconds // 60} minutes\n"
            f"- Max tickets per user per event: {settings.max_tickets_per_user}\n"
            "- Payment method: Stripe (credit/debit cards)\n"
            "- After reservation, you must complete payment before the hold expires\n"
            "- Expired reservations automatically release tickets back to the pool\n"
            "- Confirmed bookings receive a PDF ticket via email\n"
        )