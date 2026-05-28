"""Database seeder for development/testing data."""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from seatflow.core.security import get_password_hash
from seatflow.db.models import load_all_models
from seatflow.db.models.booking import Booking, BookingStatus
from seatflow.db.models.event import Event
from seatflow.db.models.payment import Payment
from seatflow.db.models.ticket import Ticket, TicketStatus, SeatType
from seatflow.db.models.user import User
from seatflow.config import settings


async def seed() -> None:
    load_all_models()
    engine = create_async_engine(str(settings.db_url), echo=settings.db_echo)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # Clear existing data
        for table in ["payments", "bookings", "tickets", "events", "users"]:
            await session.execute(text(f"DELETE FROM {table}"))

        # --- Users ---
        users = [
            User(
                email="admin@example.com",
                full_name="Admin User",
                hashed_password=get_password_hash("admin12345"),
                is_active=True,
                is_superuser=True,
            ),
            User(
                email="john@example.com",
                full_name="John Doe",
                hashed_password=get_password_hash("john12345"),
                is_active=True,
                is_superuser=False,
            ),
            User(
                email="jane@example.com",
                full_name="Jane Smith",
                hashed_password=get_password_hash("jane12345"),
                is_active=True,
                is_superuser=False,
            ),
        ]
        session.add_all(users)
        await session.flush()

        admin, john, jane = users

        # --- Events ---
        now = datetime.now(timezone.utc)
        events = [
            Event(
                title="Taylor Swift - Eras Tour",
                description="Experience the iconic Eras Tour live in concert.",
                venue="SoFi Stadium, Los Angeles",
                event_date=now + timedelta(days=30),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=29),
                total_tickets=50,
                available_tickets=50,
                price_per_ticket=149.99,
                image_url="/images/events/taylor-swift.png",
                is_active=True,
            ),
            Event(
                title="Coldplay - Music of the Spheres",
                description="Coldplay brings their spectacular Music of the Spheres world tour.",
                venue="Wembley Stadium, London",
                event_date=now + timedelta(days=45),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=44),
                total_tickets=80,
                available_tickets=80,
                price_per_ticket=99.50,
                image_url="/images/events/coldplay.png",
                is_active=True,
            ),
            Event(
                title="NBA Finals - Game 7",
                description="The ultimate championship showdown. Who will take the trophy?",
                venue="Madison Square Garden, New York",
                event_date=now + timedelta(days=15),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=14),
                total_tickets=50,
                available_tickets=50,
                price_per_ticket=250.00,
                image_url="/images/events/nba-finals.png",
                is_active=True,
            ),
            Event(
                title="Hamilton - Broadway Musical",
                description="The revolutionary musical that changed Broadway forever.",
                venue="Richard Rodgers Theatre, New York",
                event_date=now + timedelta(days=60),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=59),
                total_tickets=40,
                available_tickets=40,
                price_per_ticket=199.00,
                image_url="/images/events/hamilton.png",
                is_active=True,
            ),
            Event(
                title="Champions League Final 2026",
                description="The biggest night in European football.",
                venue="Allianz Arena, Munich",
                event_date=now + timedelta(days=20),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=19),
                total_tickets=60,
                available_tickets=60,
                price_per_ticket=175.00,
                image_url="/images/events/champions-league.png",
                is_active=True,
            ),
            Event(
                title="Ed Sheeran - Mathematics Tour",
                description="An intimate evening of music with Ed Sheeran.",
                venue="O2 Arena, London",
                event_date=now + timedelta(days=50),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=49),
                total_tickets=50,
                available_tickets=50,
                price_per_ticket=120.00,
                image_url="/images/events/ed-sheeran.png",
                is_active=True,
            ),
            Event(
                title="Wimbledon Men's Final 2026",
                description="Witness tennis history at the All England Club.",
                venue="All England Lawn Tennis Club, London",
                event_date=now + timedelta(days=40),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=39),
                total_tickets=30,
                available_tickets=30,
                price_per_ticket=350.00,
                image_url="/images/events/wimbledon.png",
                is_active=True,
            ),
            Event(
                title="Cirque du Soleil - Alegria",
                description="A breathtaking acrobatic spectacle for all ages.",
                venue="Big Top, Las Vegas",
                event_date=now + timedelta(days=10),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=9),
                total_tickets=40,
                available_tickets=40,
                price_per_ticket=85.00,
                image_url="/images/events/cirque-du-soleil.png",
                is_active=True,
            ),
            Event(
                title="F1 Monaco Grand Prix 2026",
                description="The most prestigious race in Formula 1.",
                venue="Circuit de Monaco, Monte Carlo",
                event_date=now + timedelta(days=25),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=24),
                total_tickets=50,
                available_tickets=50,
                price_per_ticket=450.00,
                image_url="/images/events/f1-monaco.png",
                is_active=True,
            ),
            Event(
                title="Adele - Weekends with Adele",
                description="An unforgettable night with the voice of a generation.",
                venue="The Colosseum, Las Vegas",
                event_date=now + timedelta(days=55),
                sale_start_date=now,
                sale_end_date=now + timedelta(days=54),
                total_tickets=35,
                available_tickets=35,
                price_per_ticket=225.00,
                image_url="/images/events/adele.png",
                is_active=True,
            ),
        ]
        session.add_all(events)
        await session.flush()

        # --- Tickets for each event (batched) ---
        for event in events:
            batch = []
            for i in range(1, event.total_tickets + 1):
                if i <= 5:
                    seat_type = SeatType.vip
                    section = "VIP"
                    price = round(event.price_per_ticket * 2.5, 2)
                elif i <= 15:
                    seat_type = SeatType.premium
                    section = "Premium"
                    price = round(event.price_per_ticket * 1.5, 2)
                else:
                    seat_type = SeatType.general
                    section = "General"
                    price = event.price_per_ticket
                batch.append(
                    Ticket(
                        event_id=event.id,
                        seat_number=f"{section}-{i:04d}",
                        section=section,
                        seat_type=seat_type,
                        price=price,
                        status=TicketStatus.available,
                    )
                )
            session.add_all(batch)
            await session.flush()

        # --- A couple of bookings ---
        booking1 = Booking(
            user_id=john.id,
            event_id=events[0].id,
            ticket_count=2,
            total_amount=299.98,
            status=BookingStatus.confirmed,
            reserved_at=now - timedelta(days=1),
            expires_at=None,
        )
        booking2 = Booking(
            user_id=jane.id,
            event_id=events[2].id,
            ticket_count=1,
            total_amount=250.00,
            status=BookingStatus.reserved,
            reserved_at=now,
            expires_at=now + timedelta(minutes=10),
        )
        session.add_all([booking1, booking2])

        await session.commit()

    print("Seeded: 3 users, 10 events, tickets, and 2 bookings.")


if __name__ == "__main__":
    asyncio.run(seed())
