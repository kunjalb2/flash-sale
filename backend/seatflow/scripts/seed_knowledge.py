from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from seatflow.config import settings
from seatflow.db.models import load_all_models
from seatflow.db.dao.knowledge import KnowledgeEntryDAO
from seatflow.db.models.chat import KnowledgeCategory

load_all_models()

SEED_ENTRIES = [
    {
        "category": KnowledgeCategory.booking_policy,
        "question": "How long is my reservation held?",
        "answer": "Your reservation is held for 5 minutes. You must complete payment within this time or the tickets will be released back to the pool.",
        "keywords": "reservation, hold, time, expire, timeout",
        "is_active": True,
        "priority": 10,
    },
    {
        "category": KnowledgeCategory.booking_policy,
        "question": "How many tickets can I buy at once?",
        "answer": "You can reserve up to 5 tickets per event. This limit ensures fair access during flash sales.",
        "keywords": "limit, maximum, tickets, per user, buy",
        "is_active": True,
        "priority": 10,
    },
    {
        "category": KnowledgeCategory.flash_sale,
        "question": "What is a flash sale?",
        "answer": "A flash sale is a limited-time ticket release with high demand. Tickets are available on a first-come, first-served basis. Reserve quickly and complete payment within 5 minutes to secure your seats.",
        "keywords": "flash sale, limited, time, demand, rush",
        "is_active": True,
        "priority": 9,
    },
    {
        "category": KnowledgeCategory.flash_sale,
        "question": "What happens if my reservation expires?",
        "answer": "If you don't complete payment within 5 minutes, your reservation is automatically cancelled and the tickets are released back for others to purchase. You can try again if tickets are still available.",
        "keywords": "expire, cancelled, release, payment, timeout",
        "is_active": True,
        "priority": 9,
    },
    {
        "category": KnowledgeCategory.payment,
        "question": "What payment methods do you accept?",
        "answer": "We accept credit and debit cards via Stripe. Payment is processed securely and you'll receive a receipt via email after confirmation.",
        "keywords": "payment, stripe, credit card, debit, pay, method",
        "is_active": True,
        "priority": 8,
    },
    {
        "category": KnowledgeCategory.payment,
        "question": "Can I get a refund?",
        "answer": "Refund policies vary by event. Generally, refunds are available up to 48 hours before the event. Contact support for refund requests.",
        "keywords": "refund, money back, cancel, return",
        "is_active": True,
        "priority": 8,
    },
    {
        "category": KnowledgeCategory.cancellation,
        "question": "How do I cancel my booking?",
        "answer": "Go to your Bookings page, find the booking you want to cancel, and click Cancel. If the booking is confirmed, you may be eligible for a refund depending on the event's cancellation policy.",
        "keywords": "cancel, booking, cancel, stop",
        "is_active": True,
        "priority": 7,
    },
    {
        "category": KnowledgeCategory.general,
        "question": "How do I download my tickets?",
        "answer": "After your booking is confirmed, go to your Bookings page and click the Download button to get your PDF tickets.",
        "keywords": "download, tickets, pdf, get tickets",
        "is_active": True,
        "priority": 7,
    },
    {
        "category": KnowledgeCategory.venue,
        "question": "Where can I find venue information?",
        "answer": "Venue details including address are shown on each event page. Click on an event to see the full venue information.",
        "keywords": "venue, location, address, where, directions",
        "is_active": True,
        "priority": 5,
    },
    {
        "category": KnowledgeCategory.general,
        "question": "Do I need an account to buy tickets?",
        "answer": "Yes, you need a SeatFlow account to purchase tickets. Registration is quick and free. This helps us manage your bookings and send you ticket confirmations.",
        "keywords": "account, register, sign up, create, needed",
        "is_active": True,
        "priority": 6,
    },
]


async def seed() -> None:
    engine = create_async_engine(str(settings.db_url))
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with session_maker() as session:
        repo = KnowledgeEntryDAO(session)

        existing = await repo.list_active(limit=100)
        if existing:
            print(f"Knowledge base already has {len(existing)} entries. Skipping seed.")
            return

        for entry_data in SEED_ENTRIES:
            await repo.create(entry_data)

        await session.commit()
        print(f"Seeded {len(SEED_ENTRIES)} knowledge base entries.")

    await engine.dispose()


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed())