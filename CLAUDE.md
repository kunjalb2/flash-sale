# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SeatFlow is a premium flash-sale ticket booking platform built as a learning project for scalable distributed systems. It's a modular monolith with separate backend (FastAPI) and frontend (Next.js 15) services.

### Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x (async), PostgreSQL, Redis, RabbitMQ, Celery, Stripe
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query

## Development Commands

### Backend

```bash
cd backend

# Install dependencies
make install

# Start dev server (requires docker-compose up -d for postgres, redis, rabbitmq)
make dev
# Or: uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000

# Docker - start all services
make docker-up
make docker-down       # Stop all Docker services
make docker-logs       # View Docker logs

# Database migrations
make upgrade           # alembic upgrade head
make migrate MSG="desc" # alembic revision --autogenerate -m "desc"
make rollback          # alembic downgrade -1

# Tests
make test              # pytest -v
make test-cov          # pytest --cov=seatflow --cov-report=html --cov-report=term-missing
pytest tests/ -k "test_name" -v  # run specific test
pytest -m integration            # run integration tests only
pytest -m unit                   # run unit tests only
pytest -m slow                   # run slow tests only

# Code quality
make lint              # ruff check .
make format            # ruff format .
make clean             # clean Python cache files

# Background tasks
make celery            # celery -A seatflow.tasks.celery_app worker --loglevel=info
make celery-beat       # celery -A seatflow.tasks.celery_app beat --loglevel=info
make flower            # celery -A seatflow.tasks.celery_app flower (http://localhost:5555)
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Dev server
npm run dev

# Build & type check
npm run build
npm run type-check      # tsc --noEmit
npm run lint
```

## Architecture

### Backend - Modular Monolith

The backend follows a clean architecture with clear separation of concerns:

```
seatflow/
├── web/api/          # API endpoint handlers (thin, delegation only)
│   ├── auth/         # Auth endpoints + schemas
│   ├── events/       # Events endpoints + schemas
│   ├── bookings/     # Booking/reservation endpoints + schemas
│   ├── payments/     # Payment endpoints + schemas
│   ├── admin/        # Admin endpoints + schemas
│   ├── chat/         # AI chat assistant endpoints + schemas
│   └── monitoring/   # Health/metrics endpoints
├── core/             # Logging, security, exceptions
├── db/
│   ├── dao/          # Data access layer (SQL operations)
│   └── models/       # SQLAlchemy ORM models (DB schema)
├── services/         # Business logic layer (booking, auth, payment)
│   ├── auth/         # Authentication business logic
│   ├── booking/      # Booking/reservation business logic
│   ├── event/        # Event management business logic
│   ├── payment/      # Payment processing business logic
│   ├── ticket/       # Ticket generation business logic
│   └── chat/         # AI chat assistant business logic (OpenAI)
├── tasks/            # Celery background tasks
├── events/           # Event-driven communication (RabbitMQ)
├── payment/          # Payment provider abstraction (Stripe)
└── config.py         # Pydantic settings configuration
```

**Key patterns:**
- Route handlers (`web/api/{module}/views.py`) are thin - delegate to services
- Schemas are co-located with endpoints (`web/api/{module}/schema.py`)
- Services contain business logic, use DAO layer for data
- DAO layer (`db/dao/`) handles all DB operations via SQLAlchemy
- Background tasks (`tasks/`) for async operations (booking confirmations, expirations)
- Events (`events/`) for decoupled communication between services
- Payment is abstracted - Stripe is current provider, easily swappable
- AI Chat: OpenAI integration with async Celery tasks for message processing
- Database sessions use dependency injection with auto-commit/rollback via `get_db_session()`

**Critical flows:**
- Booking: Service uses Redis distributed locks for concurrency, RabbitMQ for async confirmation
- Auth: JWT tokens with refresh flow, password hashing with bcrypt, rate limiting on login/register
- Payment: Stripe integration with webhook-based status updates
- AI Chat: Async message processing via Celery, OpenAI API, session-based conversation history with limits

### Frontend - App Router + Zustand

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── events/            # Events listing and details
│   ├── bookings/          # Booking history
│   ├── checkout/          # Payment checkout flow
│   ├── admin/             # Admin pages
│   └── profile/           # User profile
├── components/
│   ├── layout/            # Shell, Header, Footer
│   ├── ui/                # shadcn/ui components (Radix primitives)
│   └── (feature-specific directories)
├── lib/
│   └── api-client.ts      # Axios wrapper with auto token refresh
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores (auth-store)
├── guards/                # AuthGuard (route protection)
├── types/                 # TypeScript types
└── services/              # Business logic services
```

**Key patterns:**
- API client (`lib/api-client.ts`) wraps Axios with auto token refresh on 401
- TanStack Query for server state (via hooks), Zustand for client state (auth)
- shadcn/ui components for consistent UI (copy, don't modify components/ui/* directly)
- AuthGuard protects routes requiring authentication
- TypeScript path alias `@/*` maps to `./src/*` for clean imports

## Configuration

### Backend
- Environment: `.env` (copy from `.env.local` for local dev)
- Settings: `seatflow/config.py` using pydantic-settings
- Key vars: `APP_ENV`, `DB_HOST`, `REDIS_HOST`, `RABBITMQ_HOST`, `STRIPE_SECRET_KEY`, `PAYMENT_MODE`, `CHAT_LLM_API_KEY`, `CHAT_ENABLED`

### Frontend
- Environment: `.env.local` (copy from `.env.local.example`)
- Key vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`

## API Documentation

Backend runs at: http://localhost:8000/api
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json
- **Health Check**: http://localhost:8000/api/v1/health

## Load Testing

```bash
cd backend
locust -f tests/load_testing/locustfile.py --host=http://localhost:8000
# Headless mode for automated testing
locust -f tests/load_testing/locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 10 --run-time 1m
```

## Local Development (Non-Docker)

For running without Docker, follow the detailed setup in [LOCAL_SETUP_GUIDE.md](./LOCAL_SETUP_GUIDE.md).

**Quick start requires 5 terminals:**
```bash
# Terminal 1 - Backend
cd backend && source .venv/bin/activate && uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Celery Worker
cd backend && source .venv/bin/activate && celery -A seatflow.tasks.celery_app worker --loglevel=info --concurrency=4

# Terminal 3 - Celery Beat
cd backend && source .venv/bin/activate && celery -A seatflow.tasks.celery_app beat --loglevel=info

# Terminal 4 - Flower (Optional - monitoring)
cd backend && source .venv/bin/activate && celery -A seatflow.tasks.celery_app flower

# Terminal 5 - Frontend
cd frontend && npm run dev
```

## Docker Services

| Service | Ports | Description |
|---------|-------|-------------|
| `postgres` | 5432 | Primary database |
| `redis` | 6379 | Cache & distributed locks |
| `rabbitmq` | 5672, 15672 | Message queue & management UI |

## Code Quality Standards

- **Backend**: Ruff for linting/formatting, pytest with pytest-asyncio
- **Frontend**: ESLint, TypeScript strict mode, Next.js built-in linting
- Line length: 100 chars (backend)
- All async code uses `async/await` pattern
- No F401 unused imports suppressed in ruff

## Unified Logging

All logging must use the `ServiceLogger` class from `seatflow/core/logging/service_logger.py`. The primary pattern used throughout the codebase is `log_service_operation()`:

```python
from seatflow.core.logging.service_logger import ServiceLogger

# Primary logging method (most common pattern)
ServiceLogger.log_service_operation(
    service_name="AuthService",
    operation="user_login",
    user_id=str(user.id),
    entity_id=str(user.id),
    success=True,
    error=str(e) if e else None,
    details={
        "email": user.email,
        "duration_ms": round((time.time() - start_time) * 1000, 2),
    },
    level="info"  # or "warning"
)

# Alternative logging methods (less common)
ServiceLogger.log_business_logic(
    service="PricingService",
    operation="calculate_pricing",
    user_id=user_id,
    base_price=100,
    discount=0.1
)

ServiceLogger.log_performance(
    service="Database",
    operation="query",
    duration_ms=45.2,
    table="users"
)

ServiceLogger.log_db(
    operation="save",
    table="users",
    user_id=user_id,
    entity_id=str(user.id)
)

ServiceLogger.log_external(
    service="Stripe",
    operation="charge",
    status_code=200,
    duration_ms=120,
    user_id=user.id
)
```

## Request Tracing

All HTTP requests are automatically traced with a unique request ID available in:
- Request state: `request.state.request_id`
- Response header: `X-Request-ID`

## Key Architectural Patterns

### 1. Flash-Sale Concurrency Control
- Redis distributed locks prevent overselling
- Configurable reservation timeout (default: 5 minutes, `SEATFLOW_RESERVATION_TIMEOUT_SECONDS`)
- Max tickets per user limit (default: 5, `SEATFLOW_MAX_TICKETS_PER_USER`)
- RabbitMQ for async booking confirmation emails
- Cache layers for event listings and details with configurable TTL

### 2. Event-Driven Architecture
- Events published to RabbitMQ for decoupled communication
- Celery consumers handle background tasks
- Example: Booking confirmation email triggered via event

### 3. Payment Processing
- Stripe integration with webhook-based status updates
- Idempotency keys for safe retry logic
- Payment status synchronization via background jobs

### 4. AI Chat Assistant
- OpenAI API integration (configurable model: `gpt-4o-mini` default)
- Async message processing via Celery tasks (`chat_tasks.py`)
- Session-based conversation history with limits:
  - Max history messages per request: 10
  - Max total messages per session: 30
  - Max sessions per user per day: 10
- Configurable token limits and temperature
- All chat requires authentication

### 5. Database Patterns
- Async SQLAlchemy with session-per-request pattern via `get_db_session()` dependency
- Auto-commit on success, auto-rollback on exception
- DAO pattern for data access abstraction (in `seatflow/db/dao/`)

### 6. Rate Limiting & Security
- Login rate limiting via `LoginRateLimit` dependency (configurable per minute)
- Registration rate limiting via `RegisterRateLimit` dependency
- JWT tokens with refresh flow
- Password hashing with bcrypt

## Database Migrations

Always use the `make` commands for database operations:
- `make upgrade` - Apply all pending migrations
- `make migrate MSG="description"` - Create and apply new migration
- `make rollback` - Rollback last migration

## Background Task Patterns

Background tasks follow these patterns:
- Use `seatflow/tasks/tasks` for periodic cleanup jobs
- Always include logging with `ServiceLogger`
- Handle exceptions gracefully with proper error logging
- Return structured status dictionaries

## Testing Strategy

- Unit tests focus on service layer logic
- Integration tests cover API endpoints with real database
- Load tests simulate flash-sale scenarios with Locust
- Mock external services (Stripe, email, OpenAI) in unit tests
- Test markers: `pytest -m unit`, `pytest -m integration`, `pytest -m slow`

## Common Development Workflows

### Adding a New Feature
1. Create database migration if needed (`make migrate`)
2. Add models in `seatflow/db/models/`
3. Implement DAO methods in `seatflow/db/dao/`
4. Build service layer with business logic in `seatflow/services/`
5. Add API endpoints with schemas in `seatflow/web/api/{module}/`
6. Write tests covering all scenarios

### Debugging Performance Issues
1. Check logs for slow operations using `ServiceLogger.log_performance`
2. Monitor Redis lock contention
3. Profile database queries with EXPLAIN ANALYZE
4. Use Flower dashboard to inspect Celery task performance

### Payment Integration Changes
1. Update `seatflow/payment/` for provider abstraction
2. Modify service logic in `seatflow/services/payment/`
3. Test with Stripe webhook simulator
4. Ensure idempotency for all payment operations

### Adding AI Chat Features
1. Update `seatflow/services/chat/` for business logic
2. Add/modify tasks in `seatflow/tasks/chat_tasks.py` for async processing
3. Add endpoints in `seatflow/web/api/chat/`
4. Configure OpenAI credentials in `.env` (`SEATFLOW_CHAT_LLM_API_KEY`)
5. Test chat endpoints with authentication

## Additional Resources

- [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) - Deep dive into architecture patterns, concurrency control, and business flows
- [LOCAL_SETUP_GUIDE.md](./LOCAL_SETUP_GUIDE.md) - Detailed local development setup without Docker
- [README.md](./README.md) - Project overview and learning goals