# Non-Python Developer Guide to SeatFlow

This guide is designed for developers coming from other languages (especially PHP/JavaScript) who need to understand, navigate, and work on the SeatFlow Python codebase.

## Table of Contents

1. [Python vs PHP: Key Differences](#python-vs-php-key-differences)
2. [Project Structure Overview](#project-structure-overview)
3. [Understanding the Codebase](#understanding-the-codebase)
4. [Common Development Tasks](#common-development-tasks)
5. [How Requirements Become Code](#how-requirements-become-code)
6. [Testing Your Changes](#testing-your-changes)
7. [Common Patterns and Anti-Patterns](#common-patterns-and-anti-patterns)
8. [Debugging Tips](#debugging-tips)
9. [Quick Reference](#quick-reference)

---

## Python vs PHP: Key Differences

### 1. Type System

**PHP (Dynamic, optional types):**
```php
function bookTicket($userId, $eventId, $ticketCount) {
    // No type hints (PHP 7.x+ supports but optional)
    return $booking;
}
```

**Python (Type hints, optional but recommended):**
```python
def book_ticket(
    user_id: UUID,
    event_id: UUID,
    ticket_count: int
) -> Booking:
    return booking
```

**Key Points:**
- Python uses `: Type` for parameter types
- Python uses `-> ReturnType` for return type
- Type hints are optional but enforced by tools (mypy)
- `|` operator for unions (Python 3.10+): `str | int`

### 2. Classes and Namespaces

**PHP:**
```php
namespace App\Services;

class BookingService {
    public function __construct() {
        // Constructor
    }

    public function bookTicket($userId, $eventId) {
        return new Booking();
    }
}

// Usage
$service = new BookingService();
$booking = $service->bookTicket($userId, $eventId);
```

**Python:**
```python
from uuid import UUID

class BookingService:
    def __init__(self):
        # Constructor (always __init__)
        pass

    def book_ticket(self, user_id: UUID, event_id: UUID) -> Booking:
        return Booking()

# Usage
service = BookingService()
booking = service.book_ticket(user_id, event_id)
```

**Key Points:**
- No `namespace` keyword - directory structure defines namespace
- Constructor is always `__init__`
- `self` is required for instance methods
- No `$` for variables
- Indentation matters (no braces)

### 3. Dependency Injection

**PHP (Constructor injection):**
```php
class BookingService {
    private $bookingRepository;
    private $eventRepository;

    public function __construct(
        BookingRepository $bookingRepository,
        EventRepository $eventRepository
    ) {
        $this->bookingRepository = $bookingRepository;
        $this->eventRepository = $eventRepository;
    }
}
```

**Python (FastAPI style with dependencies):**
```python
from typing import Annotated
from fastapi import Depends

class BookingService:
    def __init__(
        self,
        session: DBSession,  # Type alias with dependency
        cache: CacheService
    ):
        self.session = session
        self.cache = cache

# In API endpoint
@router.post("/reservations")
async def create_reservation(
    session: DBSession,  # Auto-injected by FastAPI
    cache: Annotated[CacheService, Depends(get_cache_service)]
) -> ReservationResponse:
    service = BookingService(session, cache)
    return await service.create_reservation(...)
```

### 4. Async/Await

**PHP (Traditional synchronous):**
```php
function getEvent($eventId) {
    $event = $this->repository->find($eventId);  // Blocking
    return $event;
}
```

**Python (Async with FastAPI):**
```python
async def get_event(self, event_id: UUID) -> Event | None:
    # Non-blocking I/O
    event = await self.event_dao.get_by_id(event_id)
    return event
```

**Key Points:**
- `async def` defines async function
- `await` yields control back to event loop
- Use async for I/O operations (DB, HTTP, cache)
- FastAPI requires async for endpoints

### 5. Array vs List/Dict

**PHP:**
```php
$user = [
    'id' => 1,
    'name' => 'John',
    'email' => 'john@example.com'
];

// Access
echo $user['name'];

// Loop
foreach ($users as $user) {
    echo $user['name'];
}
```

**Python:**
```python
user = {
    'id': 1,
    'name': 'John',
    'email': 'john@example.com'
}

# Access
print(user['name'])  # or user.get('name')

# Loop
for user in users:
    print(user['name'])

# List comprehension
names = [user['name'] for user in users]
```

**Key Points:**
- `dict` instead of `array` (key-value)
- `list` instead of `array` (indexed)
- Use `[]` for both
- Dictionary access with `[]` or `.get()`

### 6. Error Handling

**PHP:**
```php
try {
    $booking = $this->service->bookTicket($userId, $eventId);
} catch (BookingException $e) {
    throw new HttpResponseException(
        new JsonResponse(['error' => $e->getMessage()], 400)
    );
}
```

**Python:**
```python
try:
    booking = await self.service.book_ticket(user_id, event_id)
except BookingException as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e)
    )
```

**Key Points:**
- `try/except` instead of `try/catch`
- `raise` instead of `throw`
- Exception class as type hint
- HTTPException for API errors

---

## Project Structure Overview

### High-Level Architecture

```
seatflow/                        # Main package (like namespace)
├── web/                         # API layer (like routes/controllers)
│   └── api/                     # API endpoints
│       ├── auth/                # Auth routes
│       │   ├── views.py         # Route handlers (like controller)
│       │   └── schema.py        # Request/Response schemas (like DTOs)
│       ├── bookings/            # Booking routes
│       │   ├── views.py
│       │   └── schema.py
│       ├── events/              # Event routes
│       │   ├── views.py
│       │   └── schema.py
│       └── payments/            # Payment routes
│           ├── views.py
│           └── schema.py
├── services/                    # Business logic (like Service layer)
│   ├── auth/
│   │   └── auth_service.py      # Auth business logic
│   ├── booking/
│   │   └── booking.py           # Booking business logic
│   ├── event/
│   │   └── event_service.py     # Event business logic
│   └── payment/
│       └── payment_service.py   # Payment business logic
├── db/                          # Data access (like Repository layer)
│   ├── dao/                     # Data Access Objects
│   │   ├── booking.py
│   │   ├── event.py
│   │   └── user.py
│   └── models/                  # ORM models (like Eloquent models)
│       ├── booking.py
│       ├── event.py
│       └── user.py
├── core/                        # Core utilities
│   ├── logging/
│   │   └── service_logger.py    # Unified logging
│   ├── middleware/              # Middleware (like Laravel middleware)
│   └── exceptions.py            # Custom exceptions
├── tasks/                       # Background jobs (like Laravel Jobs)
│   ├── celery_app.py            # Job configuration
│   └── tasks.py                 # Job definitions
├── payment/                     # Payment abstraction
│   └── base.py                  # Payment gateway interface
├── events/                      # Domain events
│   ├── models.py                # Event classes
│   └── publisher.py             # Event publisher
├── config.py                    # Configuration (like .env + config)
└── web/                         # Web configuration
    ├── application.py           # App factory
    └── lifespan.py              # App lifecycle
```

### Request Flow Comparison

**PHP (Laravel):**
```
Client → Route → Controller → Service → Repository → DB
                ↓           ↓           ↓
            Validation  Business Logic  SQL
                ↓           ↓           ↓
            Response ← DTO ← Model ← Result
```

**Python (SeatFlow):**
```
Client → FastAPI Route (views.py) → Service (booking.py) → DAO (booking.py) → DB
              ↓                        ↓                   ↓
          Schema (Pydantic)        Business Logic      SQLAlchemy
              ↓                        ↓                   ↓
          Response ← Schema ← Model ← Result
```

---

## Understanding the Codebase

### 1. Reading an API Endpoint

**File:** `seatflow/web/api/bookings/views.py`

```python
@router.post("/reservations")
async def create_reservation(
    reservation_data: ReservationCreate,
    current_user: Annotated[User, Depends(get_current_user_id_from_token)],
    session: DBSession,
) -> ReservationResponse:
    """
    Create a new ticket reservation.

    Args:
        reservation_data: Request body validated by Pydantic
        current_user: Auto-injected user from JWT token
        session: Auto-injected database session

    Returns:
        ReservationResponse: Validated response
    """
    booking_service = BookingService(session)
    result = await booking_service.create_reservation(
        reservation_data,
        current_user,
    )

    return ReservationResponse.model_validate(result)
```

**How to read:**
1. **@router.post()**: POST endpoint at `/reservations`
2. **async def**: Async function (non-blocking)
3. **ReservationCreate**: Pydantic schema for request body (auto-validation)
4. **Annotated[User, Depends(...)]**: Dependency injection for user auth
5. **DBSession**: Type alias for database session (auto-injected)
6. **BookingService**: Business logic class
7. **await**: Wait for async operation
8. **ReservationResponse**: Pydantic schema for response

### 2. Reading a Service

**File:** `seatflow/services/booking/booking.py`

```python
class BookingService:
    """Business logic for booking operations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.booking_dao = BookingDAO(session)
        self.event_dao = EventDAO(session)
        self.cache_service = CacheService()

    async def create_reservation(
        self,
        reservation_data: ReservationCreate,
        user_id: str,
    ) -> Booking:
        """Create a new reservation with business logic."""
        # 1. Validate event exists and is active
        event = await self.event_dao.get_by_id(reservation_data.event_id)
        if not event:
            raise NotFoundException(detail="Event not found")

        if not event.is_active:
            raise BadRequestException(detail="Event is not active")

        # 2. Check ticket availability
        if event.available_tickets < reservation_data.ticket_count:
            raise ConflictException(detail="Not enough tickets available")

        # 3. Create booking
        booking = await self.booking_dao.create({
            "user_id": user_id,
            "event_id": reservation_data.event_id,
            "ticket_count": reservation_data.ticket_count,
            # ... more fields
        })

        # 4. Log operation
        ServiceLogger.log(
            service="BookingService",
            operation="create_reservation",
            user_id=user_id,
            entity_id=str(booking.id),
            success=True
        )

        return booking
```

**How to read:**
1. **class**: Class definition
2. **def __init__**: Constructor
3. **self.session**: Instance variable (like $this->session)
4. **await self.event_dao.get_by_id()**: Async call to DAO
5. **raise**: Throw exception
6. **ServiceLogger.log**: Structured logging

### 3. Reading a DAO (Data Access Object)

**File:** `seatflow/db/dao/booking.py`

```python
class BookingDAO:
    """Data access operations for bookings."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        """Get booking by ID."""
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, booking_data: dict[str, Any]) -> Booking:
        """Create a new booking."""
        booking = Booking(**booking_data)
        self.session.add(booking)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking

    async def update(self, booking: Booking, **kwargs) -> Booking:
        """Update booking fields."""
        for key, value in kwargs.items():
            setattr(booking, key, value)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking
```

**How to read:**
1. **select()**: SQLAlchemy query builder
2. **.where()**: Query conditions
3. **await self.session.execute()**: Execute query
4. **result.scalar_one_or_none()**: Get single result or None
5. **Booking(**data)**: Create ORM model from dict
6. **self.session.add()**: Add to session (INSERT)
7. **await self.session.flush()**: Execute SQL
8. **await self.session.refresh()**: Refresh from DB

### 4. Reading a Schema (Pydantic)

**File:** `seatflow/web/api/bookings/schema.py`

```python
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime

class ReservationCreate(BaseModel):
    """Schema for reservation creation request."""

    event_id: UUID
    ticket_count: int = Field(
        ge=1,
        le=10,
        description="Number of tickets to reserve"
    )

    @field_validator("ticket_count")
    @classmethod
    def validate_ticket_count(cls, v: int, info) -> int:
        """Custom validation for ticket count."""
        event_id = info.data.get("event_id")
        # Custom validation logic
        if v > 5:
            raise ValueError("Maximum 5 tickets per reservation")
        return v

class ReservationResponse(BaseModel):
    """Schema for reservation response."""

    id: UUID
    user_id: UUID
    event_id: UUID
    ticket_count: int
    total_amount: float
    status: str
    reserved_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True  # Allow from ORM models
```

**How to read:**
1. **BaseModel**: Pydantic base class for schemas
2. **Field()**: Field with constraints
3. **ge/le**: Greater/less than or equal
4. **@field_validator**: Custom validation decorator
5. **@classmethod**: Class method decorator
6. **Config**: Model configuration

---

## Common Development Tasks

### Task 1: Add a New API Endpoint

**Scenario:** Add an endpoint to get user's upcoming events.

#### Step 1: Add Schema

**File:** `seatflow/web/api/events/schema.py`

```python
class UserEventResponse(BaseModel):
    """Response for user's upcoming events."""

    id: UUID
    title: str
    venue: str
    event_date: datetime
    ticket_count: int

    class Config:
        from_attributes = True
```

#### Step 2: Add DAO Method

**File:** `seatflow/db/dao/event.py`

```python
async def get_user_upcoming_events(
    self,
    user_id: UUID,
    limit: int = 10
) -> list[Event]:
    """Get user's upcoming events."""
    stmt = (
        select(Event)
        .join(Booking, Event.id == Booking.event_id)
        .where(
            and_(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.confirmed,
                Event.event_date > datetime.now()
            )
        )
        .order_by(Event.event_date)
        .limit(limit)
    )
    result = await self.session.execute(stmt)
    return list(result.scalars().all())
```

#### Step 3: Add Service Method

**File:** `seatflow/services/event/event_service.py`

```python
async def get_user_upcoming_events(
    self,
    user_id: str,
    limit: int = 10
) -> list[dict[str, Any]]:
    """Get user's upcoming events with booking info."""
    events = await self.event_dao.get_user_upcoming_events(
        UUID(user_id),
        limit
    )

    return [
        {
            "id": str(event.id),
            "title": event.title,
            "venue": event.venue,
            "event_date": event.event_date.isoformat(),
            "ticket_count": self._get_ticket_count(event, user_id)
        }
        for event in events
    ]
```

#### Step 4: Add API Endpoint

**File:** `seatflow/web/api/events/views.py`

```python
@router.get("/my-events")
async def get_my_events(
    current_user: Annotated[User, Depends(get_current_user_id_from_token)],
    session: DBSession,
) -> list[UserEventResponse]:
    """Get current user's upcoming events."""
    event_service = EventService(session)
    events = await event_service.get_user_upcoming_events(current_user)
    return [UserEventResponse(**event) for event in events]
```

#### Step 5: Register Route

**File:** `seatflow/web/api/router.py`

```python
from seatflow.web.api.events import events

api_router.include_router(
    events.router,
    prefix="/v1/events",
    tags=["Events"]
)
```

### Task 2: Add a New Database Field

**Scenario:** Add a `phone_number` field to the User model.

#### Step 1: Update Model

**File:** `seatflow/db/models/user.py`

```python
class User(Base, UUIDMixin, TimestampMixin):
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)  # NEW
```

#### Step 2: Create Migration

```bash
# From backend directory
alembic revision --autogenerate -m "add_phone_number_to_users"
```

#### Step 3: Review Migration

**File:** `seatflow/db/migrations/versions/xxx_add_phone_number_to_users.py`

```python
def upgrade():
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('users', 'phone_number')
```

#### Step 4: Apply Migration

```bash
alembic upgrade head
```

#### Step 5: Update Schemas

**File:** `seatflow/web/api/auth/schema.py`

```python
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    phone_number: str | None = None  # NEW

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone_number: str | None  # NEW
    is_active: bool
    created_at: datetime
```

### Task 3: Add a Background Task

**Scenario:** Send reminder email 24 hours before event.

#### Step 1: Create Task

**File:** `seatflow/tasks/tasks.py`

```python
@celery_app.task(name="seatflow.tasks.tasks.send_event_reminders")
def send_event_reminders() -> dict[str, int]:
    """Send reminder emails 24 hours before events."""
    async def _send_reminders():
        # Create async session
        session_maker = async_sessionmaker(
            settings.db_url,
            expire_on_commit=False
        )

        async with session_maker() as session:
            event_dao = EventDAO(session)
            # Get events tomorrow
            tomorrow = datetime.now() + timedelta(days=1)
            events = await event_dao.get_events_by_date(tomorrow)

            sent_count = 0
            for event in events:
                # Get users with confirmed bookings
                # Send email
                sent_count += 1

            return sent_count

    try:
        count = asyncio.run(_send_reminders())
        ServiceLogger.log(
            service="EmailService",
            operation="send_event_reminders",
            success=True,
            sent_count=count
        )
        return {"sent_count": count, "status": "completed"}
    except Exception as e:
        ServiceLogger.log(
            service="EmailService",
            operation="send_event_reminders",
            success=False,
            error=str(e)
        )
        raise
```

#### Step 2: Schedule Task

**File:** `seatflow/tasks/celery_app.py`

```python
celery_app.conf.beat_schedule = {
    # ... existing tasks
    "send-event-reminders-daily": {
        "task": "seatflow.tasks.tasks.send_event_reminders",
        "schedule": crontab(hour=9, minute=0),  # 9 AM daily
    },
}
```

---

## How Requirements Become Code

### Requirement: "Users should be able to cancel reservations within 1 hour of booking"

#### Step 1: Understand the Requirement

- **Who**: Authenticated users
- **What**: Cancel reservations
- **When**: Within 1 hour of booking
- **Validation**: Check booking time vs current time

#### Step 2: Identify Files to Change

1. **API Endpoint**: `seatflow/web/api/bookings/views.py`
2. **Service**: `seatflow/services/booking/booking.py`
3. **DAO**: `seatflow/db/dao/booking.py`
4. **Schema**: `seatflow/web/api/bookings/schema.py`

#### Step 3: Implement Changes

**Schema:**
```python
# seatflow/web/api/bookings/schema.py
class CancelReservationRequest(BaseModel):
    reservation_id: UUID
    reason: str | None = Field(max_length=500)

class CancelReservationResponse(BaseModel):
    id: UUID
    status: str
    cancelled_at: datetime
```

**Service:**
```python
# seatflow/services/booking/booking.py
async def cancel_reservation(
    self,
    reservation_id: UUID,
    user_id: str,
    reason: str | None = None
) -> Booking:
    """Cancel a reservation within 1 hour of booking."""
    # Get reservation
    reservation = await self.booking_dao.get_by_id(reservation_id)
    if not reservation:
        raise NotFoundException(detail="Reservation not found")

    # Check ownership
    if str(reservation.user_id) != user_id:
        raise ForbiddenException(detail="Not your reservation")

    # Check status
    if reservation.status != BookingStatus.reserved:
        raise BadRequestException(
            detail="Can only cancel pending reservations"
        )

    # Check time limit (1 hour)
    time_diff = datetime.now() - reservation.reserved_at
    if time_diff.total_seconds() > 3600:  # 1 hour in seconds
        raise BadRequestException(
            detail="Can only cancel within 1 hour of booking"
        )

    # Cancel reservation
    updated = await self.booking_dao.update(
        reservation,
        status=BookingStatus.cancelled,
        cancelled_at=datetime.now()
    )

    # Release tickets
    await self.ticket_service.release_tickets_for_booking(reservation_id)

    # Log
    ServiceLogger.log(
        service="BookingService",
        operation="cancel_reservation",
        user_id=user_id,
        entity_id=str(reservation_id),
        success=True,
        reason=reason
    )

    return updated
```

**API:**
```python
# seatflow/web/api/bookings/views.py
@router.post("/reservations/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: UUID,
    request: CancelReservationRequest,
    current_user: Annotated[User, Depends(get_current_user_id_from_token)],
    session: DBSession,
) -> CancelReservationResponse:
    """Cancel a reservation within 1 hour of booking."""
    booking_service = BookingService(session)
    result = await booking_service.cancel_reservation(
        reservation_id,
        current_user,
        request.reason
    )
    return CancelReservationResponse.model_validate(result)
```

#### Step 4: Test

```bash
# Run tests
pytest tests/test_booking.py::test_cancel_reservation -v

# Test manually
curl -X POST http://localhost:8000/api/v1/reservations/{id}/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Changed my mind"}'
```

---

## Testing Your Changes

### Unit Tests

**File:** `tests/services/test_booking_service.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_create_reservation_success():
    """Test successful reservation creation."""
    # Setup
    mock_session = AsyncMock(spec=AsyncSession)
    mock_event = MagicMock()
    mock_event.id = "123"
    mock_event.is_active = True
    mock_event.available_tickets = 10

    mock_event_dao = AsyncMock()
    mock_event_dao.get_by_id.return_value = mock_event

    # Execute
    service = BookingService(mock_session)
    service.event_dao = mock_event_dao

    result = await service.create_reservation(
        ReservationCreate(event_id="123", ticket_count=2),
        "user-123"
    )

    # Assert
    assert result is not None
    mock_event_dao.get_by_id.assert_called_once_with("123")
```

### Integration Tests

**File:** `tests/api/test_bookings.py`

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_reservation(client: AsyncClient, auth_headers: dict):
    """Test reservation creation via API."""
    response = await client.post(
        "/api/v1/reservations",
        json={"event_id": "123", "ticket_count": 2},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ticket_count"] == 2
    assert data["status"] == "reserved"
```

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_booking.py -v

# Run specific test
pytest tests/test_booking.py::test_create_reservation -v

# Run with coverage
pytest tests/ --cov=seatflow --cov-report=html
```

---

## Common Patterns and Anti-Patterns

### Good Patterns

✅ **Use Service Layer for Business Logic**
```python
@router.post("/reservations")
async def create_reservation(
    reservation_data: ReservationCreate,
    session: DBSession,
) -> ReservationResponse:
    service = BookingService(session)  # Delegate to service
    return await service.create_reservation(reservation_data, user_id)
```

✅ **Use DAO for Data Access**
```python
class BookingDAO:
    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

✅ **Use Pydantic for Validation**
```python
class ReservationCreate(BaseModel):
    event_id: UUID
    ticket_count: int = Field(ge=1, le=10)  # Auto-validation
```

✅ **Use Dependency Injection**
```python
@router.get("/events")
async def list_events(
    session: DBSession,  # Auto-injected
) -> EventListResponse:
    service = EventService(session)
    return await service.list_events()
```

### Anti-Patterns

❌ **Business Logic in Controllers**
```python
# BAD
@router.post("/reservations")
async def create_reservation(
    reservation_data: ReservationCreate,
    session: DBSession,
) -> ReservationResponse:
    # Don't put business logic here!
    event = await session.get(Event, reservation_data.event_id)
    if not event.is_active:
        raise HTTPException(400, "Event not active")
    # ... more logic
```

❌ **Raw SQL in Services**
```python
# BAD
async def get_event(self, event_id: UUID) -> Event:
    # Don't use raw SQL in services
    result = await self.session.execute(
        "SELECT * FROM events WHERE id = :id",
        {"id": event_id}
    )
    return result.fetchone()
```

❌ **Ignoring Type Hints**
```python
# BAD
def process(data):  # What is data? What does it return?
    return result

# GOOD
def process(data: dict[str, Any]) -> Result:
    return Result(**data)
```

❌ **Silent Failures**
```python
# BAD
try:
    result = await some_operation()
except:
    pass  # Silent failure

# GOOD
try:
    result = await some_operation()
except Exception as e:
    ServiceLogger.log(
        service="Service",
        operation="some_operation",
        success=False,
        error=str(e)
    )
    raise
```

---

## Debugging Tips

### 1. Add Breakpoints

```python
def some_function():
    breakpoint()  # Execution stops here with interactive REPL
    result = do_something()
    return result
```

### 2. Print Debugging

```python
from seatflow.core.logging.service_logger import ServiceLogger

def some_function():
    data = {"key": "value"}
    ServiceLogger.log_business_logic(
        service="Debug",
        operation="some_function",
        data=data
    )
```

### 3. Check Logs

```bash
# Backend logs
tail -f logs/app.log

# Docker logs
docker-compose logs -f backend
```

### 4. Use FastAPI Auto-Docs

Visit: http://localhost:8000/api/docs

### 5. Test with curl

```bash
# Test endpoint
curl -X POST http://localhost:8000/api/v1/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "uuid", "ticket_count": 2}' \
  -v
```

---

## Quick Reference

### File Locations

| What You Want | Where to Look |
|---------------|---------------|
| API endpoints | `seatflow/web/api/{module}/views.py` |
| Request/Response schemas | `seatflow/web/api/{module}/schema.py` |
| Business logic | `seatflow/services/{module}/` |
| Data access | `seatflow/db/dao/{module}.py` |
| Database models | `seatflow/db/models/{module}.py` |
| Background tasks | `seatflow/tasks/tasks.py` |
| Configuration | `seatflow/config.py` |
| Logging | `seatflow/core/logging/service_logger.py` |
| Exceptions | `seatflow/core/exceptions.py` |

### Common Commands

```bash
# Start backend
uvicorn seatflow.web.application:get_app --factory --reload

# Run tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ --cov=seatflow

# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head

# Format code
ruff format .

# Lint code
ruff check .

# Type check
mypy seatflow/
```

### Python Syntax Cheat Sheet

```python
# Variables (no $)
user_id = "123"

# Types
user_id: str = "123"
optional: str | None = None

# Lists
items = [1, 2, 3]

# Dictionaries
user = {"id": "123", "name": "John"}

# Functions
def greet(name: str) -> str:
    return f"Hello, {name}"

# Async functions
async def fetch_user(user_id: str) -> User:
    return await user_dao.get_by_id(user_id)

# Classes
class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user(self, user_id: str) -> User:
        return await self.user_dao.get_by_id(user_id)

# Exceptions
raise HTTPException(
    status_code=400,
    detail="Invalid input"
)

# Type checking with isinstance
if isinstance(user, AdminUser):
    # admin logic
```

---

**Last Updated:** 2026-05-23
**Project Version:** 0.1.0