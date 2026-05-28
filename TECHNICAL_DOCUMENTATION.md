# SeatFlow - Technical Architecture Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Patterns](#architecture-patterns)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [Core Components](#core-components)
7. [API Endpoints](#api-endpoints)
8. [Key Business Flows](#key-business-flows)
9. [Concurrency Control](#concurrency-control)
10. [Advanced Python Concepts](#advanced-python-concepts)
11. [Configuration Management](#configuration-management)
12. [Deployment Architecture](#deployment-architecture)
13. [Monitoring & Observability](#monitoring--observability)
14. [Security Considerations](#security-considerations)

---

## Executive Summary

**SeatFlow** is a premium flash-sale ticket booking platform designed to handle high-concurrency ticket reservations while maintaining data consistency. The system implements a **modular monolith** architecture with clear separation of concerns, following Domain-Driven Design (DDD) principles.

### Key Business Requirements
- Flash-sale ticket booking with time-limited reservations (5 minutes)
- Prevention of overselling through distributed locking
- Event-driven communication for decoupled services
- Payment integration with idempotency handling
- Real-time inventory management

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                          │
│                      - React, TypeScript, shadcn/ui                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS/WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                     FastAPI Backend Service                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   API    │  │ Services │  │   DAOs   │  │  Events  │            │
│  │ Handlers │  │   Layer  │  │  (Data)  │  │ Publisher│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└─────┬────────┬────────┬────────┬────────┬────────┬────────────────┘
      │        │        │        │        │        │
      │        │        │        │        │        │
┌─────▼───┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼────────┐
│PostgreSQL│ │ Redis  │ │ RabbitMQ│ │ Celery │ │ Stripe   │
│          │ │Cache/  │ │ Message │ │Workers │ │ Payment  │
│          │ │ Lock   │ │ Queue   │ │        │ │ Gateway  │
└──────────┘ └────────┘ └─────────┘ └────────┘ └─────────┘
```

---

## Architecture Patterns

### 1. Modular Monolith Pattern

The system follows a modular monolith pattern where:
- All code runs in a single deployable unit
- Internal boundaries enforce clear separation
- Each module (auth, booking, payment) is independently testable
- Modules communicate via well-defined interfaces

**Location**: `seatflow/web/api/`, `seatflow/services/`, `seatflow/db/dao/`

### 2. DAO Pattern (Data Access Object)

DAOs abstract database operations from business logic:

```python
# DAO pattern example
class BookingDAO:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, booking_data: dict[str, Any]) -> Booking:
        """Create a new booking."""
        booking = Booking(**booking_data)
        self.session.add(booking)
        await self.session.flush()
        await self.session.refresh(booking)
        return booking
```

**Benefits**:
- Centralized data access logic
- Easy mocking for tests
- Separation of concerns

### 3. Service Layer Pattern

Services contain business logic and orchestrate DAOs:

```python
class BookingService:
    def __init__(self, session: AsyncSession, cache: CacheService):
        self.session = session
        self.booking_dao = BookingDAO(session)
        self.event_dao = EventDAO(session)
        self.cache = cache
```

### 4. Event-Driven Architecture

Domain events enable loose coupling between services:

```python
# Publishing events
event_publisher = await get_event_publisher()
await event_publisher.publish(
    ReservationCreated(
        reservation_id=booking.id,
        user_id=user_id,
        event_id=reservation_data.event_id,
        ticket_count=reservation_data.ticket_count,
        total_amount=float(total_amount),
        expires_at=expires_at,
    )
)
```

**Benefits**:
- Services can react to changes without direct coupling
- Event log for audit trails
- Easy to add new event consumers

---

## Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Framework | FastAPI | High-performance async web framework |
| ORM | SQLAlchemy 2.x (async) | Database abstraction with async support |
| Database | PostgreSQL 14+ | Primary data store |
| Cache | Redis 7+ | Caching, distributed locks, rate limiting |
| Message Queue | RabbitMQ | Event-driven communication |
| Task Queue | Celery | Background job processing |
| Payment | Stripe | Payment processing |
| Password Hashing | bcrypt | Secure password storage |
| Authentication | JWT (jose) | Token-based auth |
| Validation | Pydantic V2 | Request/response validation |
| Logging | Loguru | Structured logging |
| Rate Limiting | Redis + Sorted Sets | Sliding window algorithm |
| Type Checking | MyPy | Static type checking |
| Code Quality | Ruff | Linting and formatting |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| State Management | Zustand (client), TanStack Query (server) |
| HTTP Client | Axios with interceptors |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────▶│  Booking    │────▶│  Payment    │
│─────────────│     │─────────────│     │─────────────│
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ email       │     │ user_id (FK)│     │ booking_id  │
│ full_name   │     │ event_id    │     │ user_id     │
│ hashed_pwd  │     │ ticket_count│     │ amount      │
│ is_active   │     │ total_amount│     │ status      │
│ is_superuser│     │ status      │     │ stripe_*    │
└─────────────┘     │ expires_at  │     └─────────────┘
                    └─────────────┘
                            │
                            │
                            ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Event     │────▶│  Ticket     │
                    │─────────────│     │─────────────│
                    │ id (PK)     │     │ id (PK)     │
                    │ title       │     │ event_id    │
                    │ venue       │     │ seat_number │
                    │ event_date  │     │ seat_type   │
                    │ total_tickets│     │ price       │
                    │ available   │     │ status      │
                    │ price_per   │     │ reserved_at │
                    └─────────────┘     └─────────────┘
```

### Table Details

#### Users Table
```python
class User(Base, UUIDMixin, TimestampMixin):
    email: Mapped[str]  # Unique, indexed
    full_name: Mapped[str]
    hashed_password: Mapped[str]
    is_active: Mapped[bool]
    is_superuser: Mapped[bool]
```

#### Events Table
```python
class Event(Base, UUIDMixin, TimestampMixin):
    title: Mapped[str]
    description: Mapped[str | None]
    venue: Mapped[str]
    event_date: Mapped[datetime]  # When event occurs
    sale_start_date: Mapped[datetime]  # When tickets go on sale
    sale_end_date: Mapped[datetime]
    total_tickets: Mapped[int]
    available_tickets: Mapped[int]  # Denormalized for performance
    price_per_ticket: Mapped[float]
    image_url: Mapped[str | None]
    is_active: Mapped[bool]
```

#### Tickets Table
```python
class Ticket(Base, UUIDMixin, TimestampMixin):
    event_id: Mapped[UUID]  # Foreign key
    seat_number: Mapped[str]
    section: Mapped[str | None]
    row: Mapped[str | None]
    seat_type: Mapped[SeatType]  # Enum: general, vip, premium
    price: Mapped[float]
    status: Mapped[TicketStatus]  # Enum: available, reserved, sold, cancelled
    reserved_at: Mapped[datetime | None]
    reserved_by: Mapped[str | None]  # User ID
    sold_at: Mapped[datetime | None]
```

#### Bookings Table
```python
class Booking(Base, UUIDMixin, TimestampMixin):
    user_id: Mapped[UUID]
    event_id: Mapped[UUID]
    ticket_count: Mapped[int]
    total_amount: Mapped[float]  # Numeric(10, 2)
    status: Mapped[BookingStatus]  # Enum: reserved, confirmed, cancelled, expired
    reserved_at: Mapped[datetime]
    expires_at: Mapped[datetime]  # Reservation timeout
```

#### Payments Table
```python
class Payment(Base, UUIDMixin, TimestampMixin):
    booking_id: Mapped[UUID]
    user_id: Mapped[UUID]
    stripe_checkout_session_id: Mapped[str | None]
    stripe_payment_intent_id: Mapped[str | None]
    amount: Mapped[float]  # Numeric(10, 2)
    currency: Mapped[str]  # Default: "usd"
    status: Mapped[PaymentStatus]
    payment_method: Mapped[PaymentMethod]
    paid_at: Mapped[datetime | None]
    failure_reason: Mapped[str | None]
    payment_metadata: Mapped[dict[str, Any] | None]  # JSONB
    idempotency_key: Mapped[str | None]  # For duplicate request handling
```

---

## Core Components

### 1. Application Entry Point

**File**: `backend/seatflow/web/application.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from seatflow.log import configure_logging
from seatflow.config import settings
from seatflow.web.api.router import api_router
from seatflow.web.lifespan import lifespan_setup


def get_app() -> FastAPI:
    """Get FastAPI application."""
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        description="Premium flash-sale ticket booking platform",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan_setup,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router=api_router, prefix="/api")

    @app.get("/api/v1/health")
    async def health_check() -> dict:
        return {
            "status": "healthy",
            "service": settings.app_name,
            "environment": settings.environment,
        }

    return app
```

**Key Python Concepts**:
- Factory pattern for app creation (`get_app()`)
- Lifespan management for startup/shutdown
- Middleware pattern for cross-cutting concerns (CORS)

### 2. Configuration Management

**File**: `backend/seatflow/config.py`

```python
import enum
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from yarl import URL


class LogLevel(enum.StrEnum):
    NOTSET = "NOTSET"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers_count: int = 1
    reload: bool = False

    # Application
    app_name: str = "seatflow"
    environment: str = "local"
    debug: bool = True
    log_level: LogLevel = LogLevel.INFO
    api_prefix: str = "/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "seatflow_user"
    db_pass: str = "seatflow_password"
    db_base: str = "seatflow"
    db_echo: bool = False
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_user: Optional[str] = None
    redis_pass: Optional[str] = ""
    redis_base: Optional[int] = 0
    redis_max_connections: int = 50

    # RabbitMQ
    rabbit_host: str = "localhost"
    rabbit_port: int = 5672
    rabbit_user: str = "guest"
    rabbit_pass: str = "guest"
    rabbit_vhost: str = "/"
    rabbit_pool_size: int = 2
    rabbit_channel_pool_size: int = 10

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    payment_mode: str = "sandbox"

    # Flash Sale
    reservation_timeout_seconds: int = 300
    max_tickets_per_user: int = 5
    enable_distributed_lock: bool = True

    # Cache
    cache_enabled: bool = True
    cache_ttl_seconds: int = 60
    cache_event_detail_ttl_seconds: int = 300
    cache_event_list_ttl_seconds: int = 120

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    rate_limit_login_requests: int = 5
    rate_limit_login_window: int = 60
    rate_limit_register_requests: int = 3
    rate_limit_register_window: int = 300
    rate_limit_reservation_requests: int = 10
    rate_limit_reservation_window: int = 60

    # Celery
    celery_broker_url: str = "amqp://guest:guest@localhost:5672//"
    celery_result_backend: str = "redis://localhost:6379/1"

    @property
    def db_url(self) -> URL:
        return URL.build(
            scheme="postgresql+asyncpg",
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_pass,
            path=f"/{self.db_base}",
        )

    @property
    def redis_url(self) -> URL:
        path = f"/{self.redis_base}" if self.redis_base is not None else ""
        return URL.build(
            scheme="redis",
            host=self.redis_host,
            port=self.redis_port,
            user=self.redis_user,
            password=self.redis_pass or None,
            path=path,
        )

    @property
    def rabbit_url(self) -> URL:
        return URL.build(
            scheme="amqp",
            host=self.rabbit_host,
            port=self.rabbit_port,
            user=self.rabbit_user,
            password=self.rabbit_pass,
            path=self.rabbit_vhost,
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = SettingsConfigDict(
        env_file=[".env.local", ".env"],
        env_prefix="SEATFLOW_",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
```

**Key Python Concepts**:
- `enum.StrEnum`: String enums with auto values
- `@property`: Computed attributes without calling methods
- `pydantic_settings`: Type-safe environment configuration
- `yarl.URL`: Type-safe URL building
- `env_prefix="SEATFLOW_"`: All env vars are prefixed

### 3. Database Session Management

**File**: `backend/seatflow/web/lifespan.py`

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from seatflow.services.redis.lifespan import init_redis, shutdown_redis
from seatflow.services.rabbit.lifespan import init_rabbit, shutdown_rabbit
from seatflow.config import settings


def _setup_db(app: FastAPI) -> None:
    """Create SQLAlchemy engine and session factory, store in app state."""
    engine = create_async_engine(
        str(settings.db_url),
        echo=settings.db_echo,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app.state.db_engine = engine
    app.state.db_session_factory = session_factory


@asynccontextmanager
async def lifespan_setup(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown logic."""
    app.middleware_stack = None

    _setup_db(app)
    init_redis(app)
    init_rabbit(app)

    app.middleware_stack = app.build_middleware_stack()

    yield

    await app.state.db_engine.dispose()
    await shutdown_redis(app)
    await shutdown_rabbit(app)
```

**Key Python Concepts**:
- `@asynccontextmanager`: Creates an async context manager
- `app.state`: Shared state across the application lifecycle
- Session factory pattern for database connections
- Proper resource cleanup on shutdown

### 4. Dependency Injection

**File**: `backend/seatflow/web/api/deps.py`

```python
from typing import Annotated
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from seatflow.db.dao.user import UserDAO
from seatflow.core.logging.service_logger import ServiceLogger


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    session_maker = Request.app.state.db_session_factory
    async with session_maker() as session:
        yield session


async def get_current_user_id_from_token(
    request: Request,
) -> str:
    """Extract user ID from JWT token."""
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )

    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return payload["sub"]


# Type aliases for cleaner dependency injection
DBSession = Annotated[AsyncSession, Depends(get_db)]
```

**Key Python Concepts**:
- `Annotated`: Python 3.9+ for metadata on type hints
- `Depends()`: FastAPI's dependency injection
- Type aliases for reusable dependencies
- AsyncGenerator for database sessions

### 5. Authentication & Authorization

**File**: `backend/seatflow/services/auth/auth_service.py`

```python
import bcrypt
from jose import JWTError, jwt
from datetime import timedelta, datetime

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt with salt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return {}
```

**Key Python Concepts**:
- JWT (JSON Web Tokens): Stateless authentication
- `partition()`: String method for splitting with max splits
- Bcrypt for secure password hashing
- Token-based authentication

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login and get tokens | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| GET | `/api/v1/auth/me` | Get current user | Yes |

### Event Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/events` | List events with pagination | No |
| GET | `/api/v1/events/{event_id}` | Get event details | No |
| GET | `/api/v1/events/{event_id}/tickets` | Get event tickets | No |
| GET | `/api/v1/events/{event_id}/availability` | Check ticket availability | No |

### Booking Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/reservations` | Create reservation | Yes |
| GET | `/api/v1/reservations/{reservation_id}` | Get reservation details | Yes |
| POST | `/api/v1/reservations/{reservation_id}/confirm` | Confirm reservation | Yes |
| POST | `/api/v1/reservations/{reservation_id}/cancel` | Cancel reservation | Yes |
| GET | `/api/v1/reservations` | List user bookings | Yes |

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/payments/checkout` | Create checkout session | Yes |
| POST | `/api/v1/payments/verify` | Verify payment | Yes |
| POST | `/api/v1/payments/webhook` | Stripe webhook | No |

---

## Key Business Flows

### 1. User Registration Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │ 1. POST /api/v1/auth/register
     │    {email, password, full_name}
     ▼
┌─────────────────────┐
│   AuthRouter        │
│   seatflow/web/api/auth/views.py
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   AuthService       │
│   seatflow/services/auth/auth_service.py
│   - check email exists
│   - hash password
│   - create user
│   - generate JWT tokens
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   UserDAO           │
│   seatflow/db/dao/user.py
│   - get_by_email()
│   - create()
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   PostgreSQL DB     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Return Response   │
│   {user, access_token, refresh_token}
└──────┬──────────────┘
       │
       ▼
┌─────────┐
│  Client │
└─────────┘
```

### 2. Ticket Reservation Flow (The Core Flash-Sale Logic)

```
┌─────────┐
│  Client │
└────┬────┘
     │ 1. POST /api/v1/reservations
     │    {event_id, ticket_count}
     │    Authorization: Bearer <token>
     ▼
┌────────────────────────────┐
│   Rate Limiter             │
│   - Check sliding window   │
│   - Max 10 requests/min    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   BookingService           │
│   seatflow/services/booking/booking.py
│   - Validate event active  │
│   - Check availability     │
│   - Check existing reserv. │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   TicketService            │
│   seatflow/services/ticket/ticket_service.py
│   - Acquire event lock     │
│   - Use row-level locking  │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Redis: Distributed Lock  │
│   Key: seatflow:lock:event:{id}
│   Timeout: 310 seconds     │
└──────┬─────────────────────┘
       │ Lock acquired
       ▼
┌────────────────────────────┐
│   TicketDAO                │
│   seatflow/db/dao/ticket.py
│   - SELECT ... FOR UPDATE  │
│   - Update ticket status   │
│   - Reserve tickets        │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   PostgreSQL (Row Lock)    │
│   - Lock selected rows     │
│   - Prevents concurrent    │
│     modifications          │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   BookingDAO               │
│   seatflow/db/dao/booking.py
│   - Create booking record  │
│   - Set expires_at         │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   RabbitMQ Publisher       │
│   seatflow/services/rabbit/event_publisher.py
│   - Publish ReservationCreated event
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Redis: Invalidate Cache  │
│   - Clear event cache      │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Return Reservation       │
│   {id, status, expires_at, tickets}
└──────┬─────────────────────┘
       │
       ▼
┌─────────┐
│  Client │
└─────────┘
```

### 3. Payment Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │ 1. POST /api/v1/payments/checkout
     │    {booking_id, success_url, cancel_url}
     ▼
┌────────────────────────────┐
│   PaymentService           │
│   seatflow/services/payment/payment_service.py
│   - Validate booking       │
│   - Check no existing pay. │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Generate Idempotency Key │
│   - secrets.token_urlsafe()│
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Stripe Payment Gateway   │
│   - Create checkout session│
│   - Return checkout URL    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   PaymentDAO               │
│   seatflow/db/dao/payment.py
│   - Create payment record  │
│   - Status: pending        │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Return Checkout URL      │
│   Client redirects here    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Stripe Checkout Page     │
│   User completes payment   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Stripe Webhook           │
│   POST /api/v1/payments/webhook
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   PaymentService           │
│   - Verify signature       │
│   - Process webhook        │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   BookingService           │
│   - Confirm reservation    │
│   - Update ticket status   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   Celery Task              │
│   seatflow/tasks/tasks.py
│   - Send confirmation email│
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   RabbitMQ Event           │
│   - PaymentCompleted       │
│   - TicketConfirmed        │
└──────┬─────────────────────┘
```

---

## Concurrency Control

### The Flash-Sale Problem

In a flash-sale scenario, multiple users simultaneously try to buy limited tickets. Without proper concurrency control:

```
Time | User A              | User B
-----|---------------------|---------------------
T1   | Check: 5 available | -
T2   | -                   | Check: 5 available
T3   | Reserve 3 tickets   | -
T4   | -                   | Reserve 3 tickets
T5   | Write: 2 left       | -
T6   | -                   | Write: 2 left (WRONG!)
Result: Sold 6 tickets from 5 (Overselling!)
```

### Solution: Multi-Level Locking Strategy

#### Level 1: Redis Distributed Lock

Redis distributed locks prevent overselling across multiple API server instances.

**Key Concepts**:
- `nx=True`: Only set if key doesn't exist (atomic operation)
- `ex=timeout`: Auto-expire to prevent deadlocks
- Context manager pattern: guarantees release with `finally`
- Distributed across multiple API server instances

#### Level 2: PostgreSQL Row-Level Locking

PostgreSQL row-level locking (`FOR UPDATE`) prevents race conditions within the same database connection.

**How FOR UPDATE Works**:

```
Transaction A                          Transaction B
--------------                          --------------
BEGIN
SELECT * FROM tickets
WHERE status = 'available'
FOR UPDATE  ← Locks rows
                                       BEGIN
                                       SELECT * FROM tickets
                                       WHERE status = 'available'
                                       FOR UPDATE  ← BLOCKS waiting for A
UPDATE tickets SET status = 'reserved'
COMMIT  ← Releases locks
                                       Continues (sees remaining rows)
                                       UPDATE tickets SET status = 'reserved'
                                       COMMIT
```

**Key Benefits**:
- Atomic read-modify-write
- Prevents lost updates
- No phantom reads within transaction
- Automatic release on commit/rollback

#### Level 3: Application-Level Validation

Application-level validation prevents business rule violations:
- Check existing active reservation per user
- Check user ticket limit
- Validate event availability

### Complete Concurrency Flow

```
┌─────────────┐
│  Request A  │ ──┐
└─────────────┘   │
                  ├─► ┌──────────────────────┐
┌─────────────┐   │   │   Redis Lock         │
│  Request B  │ ──┘   │   Key: event:123      │
└─────────────┘       └──────────┬───────────┘
                               │
                      ┌────────▼────────┐
                      │   Winner gets   │
                      │   the lock      │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   PostgreSQL    │
                      │   Row Lock      │
                      │   (FOR UPDATE)  │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   Update rows   │
                      │   Atomically    │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   Commit &      │
                      │   Release lock  │
                      └─────────────────┘
```

---

## Advanced Python Concepts

### 1. Async/Await Pattern

**Why Async?**
- Non-blocking I/O operations
- Handle many concurrent requests efficiently
- Ideal for I/O-bound applications (DB, HTTP, cache)

```python
# Async function definition
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield database session asynchronously."""
    session_maker = Request.app.state.db_session_factory
    async with session_maker() as session:
        yield session
        await session.commit()
```

**Key Points**:
- `async def`: Defines coroutine function
- `await`: Yields control back to event loop
- `async with`: Async context manager
- `AsyncGenerator`: Type hint for async generators

### 2. Type Hints & Generics

```python
from typing import Annotated, AsyncGenerator, Optional
from collections.abc import AsyncGenerator

# Union types with pipe operator (Python 3.10+)
expires_at: datetime | None

# Annotated types with metadata
DBSession = Annotated[AsyncSession, Depends(get_db)]

# Generic classes
class CacheService:
    async def get(self, key: str) -> Any | None:
        ...

    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        ...
```

**Key Concepts**:
- `Annotated`: Adds metadata to types (FastAPI uses this for DI)
- `AsyncGenerator`: Specific type for async generators
- `|`: Union operator (PEP 604)
- `list[str]`, `dict[str, Any]`: Generic collection types

### 3. Enum Classes

```python
import enum

class TicketStatus(str, enum.Enum):
    """String enum for ticket status."""
    available = "available"
    reserved = "reserved"
    sold = "sold"
    cancelled = "cancelled"

# Usage in model
status: Mapped[TicketStatus] = mapped_column(
    SQLEnum(TicketStatus),
    default=TicketStatus.available,
    nullable=False,
    index=True
)
```

**Benefits**:
- Type-safe status values
- IDE autocomplete support
- Self-documenting code
- Database enum mapping

### 4. Mixin Classes

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from uuid import uuid4

class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass

class TimestampMixin:
    """Mixin for adding timestamp fields."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class UUIDMixin:
    """Mixin for UUID primary key."""
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        nullable=False
    )

# Usage in models
class Ticket(Base, UUIDMixin, TimestampMixin):
    """Inherits id, created_at, updated_at."""
    # Additional fields...
```

**Benefits**:
- Reuse common fields across models
- Single source of truth for field definitions
- Easy to add common behavior

### 5. Context Managers

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lock(
    self,
    lock_key: str,
    timeout_seconds: int | None = None,
):
    """Context manager for distributed locking."""
    acquired = await self.acquire(lock_key, timeout_seconds)
    if not acquired:
        raise LockConflictException(
            detail="Resource is currently locked. Please try again."
        )

    try:
        yield
    finally:
        await self.release(lock_key)
```

**Benefits**:
- Automatic cleanup
- Exception safety
- Clear code structure

---

## Configuration Management

### Environment-Based Configuration

**File**: `backend/seatflow/config.py`

All settings use the `SEATFLOW_` prefix:
```bash
SEATFLOW_ENVIRONMENT=development
SEATFLOW_DEBUG=true
SEATFLOW_DB_HOST=localhost
SEATFLOW_REDIS_HOST=localhost
SEATFLOW_RABBIT_HOST=localhost
SEATFLOW_SECRET_KEY=your-secret-key
```

### Environment Files

**`.env.local`** (Local Development):
```bash
SEATFLOW_ENVIRONMENT=development
SEATFLOW_DEBUG=true
SEATFLOW_LOG_LEVEL=INFO

SEATFLOW_DB_HOST=localhost
SEATFLOW_DB_PORT=5432
SEATFLOW_DB_NAME=seatflow
SEATFLOW_DB_USER=seatflow_user
SEATFLOW_DB_PASS=seatflow_password

SEATFLOW_REDIS_HOST=localhost
SEATFLOW_REDIS_PORT=6379

SEATFLOW_RABBIT_HOST=localhost
SEATFLOW_RABBIT_PORT=5672

SEATFLOW_STRIPE_SECRET_KEY=sk_test_...
SEATFLOW_STRIPE_WEBHOOK_SECRET=whsec_...
SEATFLOW_PAYMENT_MODE=sandbox

SEATFLOW_SECRET_KEY=dev-secret-key-change-in-production
```

---

## Deployment Architecture

### Docker Compose (Local Development)

**File**: `backend/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: seatflow
      POSTGRES_USER: seatflow_user
      POSTGRES_PASSWORD: seatflow_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest

volumes:
  postgres_data:
  redis_data:
```

### Production Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (ALB)                    │
│                  (SSL Termination, Health Checks)            │
└─────────────────┬─────────────────────────────┬─────────────┘
                  │                             │
         ┌────────▼────────┐            ┌───────▼────────┐
         │  API Server 1   │            │  API Server N  │
         │  (FastAPI)      │            │  (FastAPI)     │
         └────────┬────────┘            └───────┬────────┘
                  │                             │
                  └──────────┬──────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐   ┌──────▼───────┐   ┌──────▼────────┐
│  PostgreSQL    │   │   Redis      │   │   RabbitMQ    │
│                │   │   Cluster    │   │   Cluster     │
└────────────────┘   └──────────────┘   └───────────────┘
```

---

## Monitoring & Observability

### Structured Logging

**File**: `backend/seatflow/core/logging/service_logger.py`

```python
from typing import Any
from loguru import logger


class ServiceLogger:
    """Unified service logging using loguru."""

    @staticmethod
    def log(
        service: str,
        operation: str,
        user_id: str | None = None,
        entity_id: str | None = None,
        success: bool = True,
        error: str | None = None,
        duration_ms: float | None = None,
        **kwargs: Any,
    ) -> None:
        log_data = {
            "service": service,
            "operation": operation,
            "success": success,
        }
        if user_id:
            log_data["user_id"] = user_id
        if entity_id:
            log_data["entity_id"] = entity_id
        if error:
            log_data["error"] = error
        if duration_ms is not None:
            log_data["duration_ms"] = duration_ms
        log_data.update(kwargs)

        if error:
            logger.error(f"{service}.{operation} | {log_data}")
        elif success:
            logger.info(f"{service}.{operation} | {log_data}")
        else:
            logger.warning(f"{service}.{operation} | {log_data}")

    @staticmethod
    def log_business_logic(service: str, operation: str, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | {kwargs}")

    @staticmethod
    def log_performance(service: str, operation: str, duration_ms: float, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | duration_ms={duration_ms} | {kwargs}")

    @staticmethod
    def log_db(operation: str, table: str, **kwargs: Any) -> None:
        logger.info(f"DB.{operation} | table={table} | {kwargs}")

    @staticmethod
    def log_external(service: str, operation: str, **kwargs: Any) -> None:
        logger.info(f"{service}.{operation} | {kwargs}")
```

### Health Check Endpoint

```python
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint for load balancer."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.environment,
    }
```

---

## Security Considerations

### 1. Authentication

- JWT tokens with expiration
- Refresh token rotation
- Password hashing with bcrypt (10 rounds)
- Token-based stateless authentication

### 2. Authorization

- Role-based access control (user, superuser)
- Resource ownership verification
- Endpoint-level permission checks

### 3. Rate Limiting

- Sliding window algorithm
- Per-endpoint configuration
- IP and user-based limiting
- Protection against DDoS

### 4. Input Validation

- Pydantic schemas for all inputs
- SQL injection prevention via ORM
- XSS protection via proper escaping

### 5. Payment Security

- Idempotency keys
- Webhook signature verification
- Secure payment flow

### 6. Secrets Management

- Environment variables for secrets
- No secrets in code
- `.gitignore` for `.env` files

---

## Appendix: File Structure

```
backend/
├── seatflow/
│   ├── web/api/                 # API route handlers
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schema.py       # Pydantic schemas
│   │   │   └── views.py        # Route handlers
│   │   ├── bookings/           # Booking/reservation endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schema.py
│   │   │   └── views.py
│   │   ├── events/             # Event endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schema.py
│   │   │   └── views.py
│   │   ├── payments/           # Payment endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schema.py
│   │   │   └── views.py
│   │   ├── admin/              # Admin endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schema.py
│   │   │   └── views.py
│   │   ├── monitoring/         # Health/metrics endpoints
│   │   │   ├── __init__.py
│   │   │   └── views.py
│   │   ├── deps.py             # Authentication dependencies
│   │   └── router.py           # API router configuration
│   ├── web/                    # Web layer
│   │   ├── application.py      # FastAPI application factory
│   │   └── lifespan.py         # Application lifespan management
│   ├── core/                   # Core utilities
│   │   ├── logging/            # Logging configuration
│   │   │   └── service_logger.py
│   │   ├── middleware/         # Custom middleware
│   │   │   ├── logging_middleware.py
│   │   │   └── exception_handler.py
│   │   └── exceptions.py       # Custom exceptions
│   ├── db/                     # Database
│   │   ├── dao/                # Data access objects
│   │   │   ├── booking.py
│   │   │   ├── event.py
│   │   │   ├── payment.py
│   │   │   ├── ticket.py
│   │   │   └── user.py
│   │   ├── migrations/         # Database migrations
│   │   │   └── versions/
│   │   └── models/             # SQLAlchemy ORM models
│   │       ├── booking.py
│   │       ├── event.py
│   │       ├── payment.py
│   │       ├── ticket.py
│   │       └── user.py
│   ├── events/                 # Event-driven architecture
│   │   ├── models.py           # Domain event classes
│   │   └── publisher.py        # Event publisher interface
│   ├── payment/                # Payment abstraction
│   │   └── base.py             # Payment gateway interface
│   ├── services/               # Business logic layer
│   │   ├── auth/               # Authentication service
│   │   ├── booking/            # Booking service
│   │   ├── event/              # Event service
│   │   ├── payment/            # Payment service
│   │   ├── rabbit/             # RabbitMQ service
│   │   ├── redis/              # Redis service
│   │   └── ticket/             # Ticket service
│   │       └── ticket_service.py
│   ├── tasks/                  # Celery background tasks
│   │   ├── celery_app.py       # Celery configuration
│   │   └── tasks.py            # Task definitions
│   ├── config.py               # Application configuration
│   ├── log.py                  # Logging configuration
│   └── seed.py                 # Database seeding
├── tests/                      # Test suite
│   ├── api/                    # API tests
│   ├── conftest.py             # Test fixtures
│   └── load_testing/           # Locust load tests
│       └── locustfile.py
├── alembic.ini                 # Alembic config
├── docker-compose.yml          # Docker services
├── Dockerfile                  # Backend Docker image
├── Makefile                    # Development commands
├── pyproject.toml              # Python project config
└── requirements.txt            # Python dependencies

frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/               # Authentication pages
│   │   ├── events/             # Event pages
│   │   ├── bookings/           # Booking pages
│   │   ├── checkout/           # Checkout pages
│   │   ├── admin/              # Admin pages
│   │   ├── profile/            # User profile
│   │   ├── dashboard/          # User dashboard
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── providers/          # React providers
│   │   └── (feature-specific directories)
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-api.ts
│   │   └── use-api-mutation.ts
│   ├── lib/                    # Utilities
│   │   ├── api-client.ts       # API client with interceptors
│   │   └── utils.ts
│   ├── stores/                 # Zustand stores
│   │   └── auth-store.ts       # Auth state management
│   ├── types/                  # TypeScript types
│   │   └── api.ts              # API response types
│   ├── guards/                 # Route guards
│   │   └── AuthGuard.tsx       # Protected route wrapper
│   └── services/               # Business logic services
├── .env.local                  # Local environment
├── next.config.ts              # Next.js config
├── package.json                # Dependencies
├── tailwind.config.ts          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

---

## Summary

SeatFlow demonstrates production-grade patterns for building scalable, concurrent systems:

1. **Modular Monolith**: Clear boundaries within single deployable unit
2. **Async/Await**: Efficient I/O handling
3. **Type Safety**: Comprehensive type hints throughout
4. **Concurrency Control**: Multi-level locking strategy (Redis + PostgreSQL)
5. **Event-Driven**: Loose coupling via domain events
6. **DAO Pattern**: Data access abstraction
7. **Background Processing**: Celery for async tasks
8. **Rate Limiting**: Sliding window algorithm
9. **Idempotency**: Safe retry mechanisms
10. **Observability**: Structured logging and health checks

This architecture can handle flash-sale traffic while maintaining data consistency and providing a great user experience.