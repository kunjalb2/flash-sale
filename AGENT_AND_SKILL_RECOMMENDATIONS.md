# SeatFlow — Recommended Subagents & Skills

> Generated from a full codebase analysis of the SeatFlow flash-sale ticket booking platform.

---

## Table of Contents

1. [Subagents](#subagents)
2. [Skills (Slash Commands)](#skills-slash-commands)
3. [Priority Matrix](#priority-matrix)

---

## Subagents

Subagents are specialized, autonomous agents that handle complex multi-step tasks within a specific domain. Each one knows the project's patterns, conventions, and architectural constraints.

---

### 1. `endpoint-scaffolder`

**Purpose:** Scaffold a complete new API endpoint module following the project's layered architecture.

**What it does:**
- Creates the full vertical slice: model → migration → DAO → service → router → schemas
- Follows the existing pattern: `seatflow/db/models/`, `seatflow/db/dao/`, `seatflow/services/`, `seatflow/web/api/{module}/views.py` + `schema.py`
- Wires the new router into `seatflow/web/application.py`
- Generates a corresponding test stub in `tests/`

**Trigger:** When adding a new domain entity or API module (e.g., "add a reviews feature", "add venue management").

**Files it reads/writes:**
- `seatflow/db/models/*.py` — new model
- `seatflow/db/dao/*.py` — new DAO
- `seatflow/services/{module}/` — new service package
- `seatflow/web/api/{module}/views.py` + `schema.py` — new endpoint
- `seatflow/web/application.py` — router registration
- `tests/` — test stubs

**Dependencies:** `database-reviewer` (validates the migration before applying).

---

### 2. `booking-concurrency-tester`

**Purpose:** Simulate flash-sale concurrent booking scenarios to validate the distributed lock and reservation timeout logic.

**What it does:**
- Uses Locust or custom async scripts to simulate N concurrent users trying to book the same ticket(s)
- Validates that: no overselling occurs, Redis locks are acquired/released correctly, reservation timeouts expire properly, ticket counts remain consistent
- Reports: success rate, average latency, lock contention metrics, any race conditions detected
- Compares results against configured limits (`SEATFLOW_RESERVATION_TIMEOUT_SECONDS`, `SEATFLOW_MAX_TICKETS_PER_USER`)

**Trigger:** Before releasing booking-related changes, or when debugging overselling reports.

**Files it reads:**
- `seatflow/core/lock.py` — distributed lock implementation
- `seatflow/services/booking/` — booking business logic
- `seatflow/config.py` — timeout and limit configs
- `tests/load_testing/locustfile.py` — existing load test patterns

**Output:** Concurrency test report with pass/fail per scenario, metrics summary.

---

### 3. `database-reviewer`

**Purpose:** Review Alembic migrations and database operations for safety, performance, and correctness.

**What it does:**
- Analyzes pending migrations for: destructive operations (DROP TABLE, DROP COLUMN), missing default values for NOT NULL columns, index usage, query performance implications
- Checks that new models follow the `seatflow/db/base.py` patterns (UUID primary key, timestamp mixins)
- Validates DAO methods use async patterns correctly and have proper error handling
- Flags N+1 query risks in relationship loading
- Verifies migration is reversible (has a working `downgrade()`)

**Trigger:** After running `make migrate`, before running `make upgrade` on staging/production, or when reviewing DAO changes.

**Files it reads:**
- `seatflow/db/migrations/versions/*.py` — migration files
- `seatflow/db/models/*.py` — model definitions
- `seatflow/db/dao/*.py` — DAO implementations
- `seatflow/db/base.py` — base model patterns

**Output:** Migration safety report with warnings, suggestions, and risk level.

---

### 4. `security-auditor`

**Purpose:** Scan the codebase for security vulnerabilities across authentication, payment, and API layers.

**What it does:**
- Checks for OWASP Top 10 vulnerabilities: SQL injection, XSS, CSRF, broken authentication, sensitive data exposure
- Validates JWT token handling: expiry, refresh flow, secret rotation readiness
- Audits Stripe integration: webhook signature verification, idempotency key usage, no logging of sensitive payment data
- Checks rate limiting coverage on all public endpoints
- Validates password hashing (bcrypt) and checks for hardcoded secrets
- Reviews CORS configuration and security headers

**Trigger:** Before releases, after auth/payment changes, or as periodic security review.

**Files it reads:**
- `seatflow/core/security.py` — auth security utilities
- `seatflow/core/rate_limiter.py` — rate limiting
- `seatflow/services/auth/` — auth business logic
- `seatflow/services/payment/` — payment business logic
- `seatflow/payment/` — Stripe abstraction
- `seatflow/web/api/` — all endpoint handlers
- `seatflow/config.py` — configuration for secrets
- `frontend/src/lib/api-client.ts` — client-side token handling

**Output:** Security audit report with severity levels (critical/high/medium/low) and remediation steps.

---

### 5. `service-builder`

**Purpose:** Create or extend a service layer module with proper business logic patterns.

**What it does:**
- Generates a new service package in `seatflow/services/{module}/` with proper structure
- Implements `ServiceLogger` logging throughout
- Adds proper error handling with domain-specific exceptions
- Integrates with the DAO layer and event system
- Includes structured input/output with validation
- Generates corresponding unit test stubs

**Trigger:** When adding new business logic or refactoring existing services.

**Files it reads/writes:**
- `seatflow/services/{module}/` — new service package
- `seatflow/core/logging/service_logger.py` — logging patterns
- `seatflow/db/dao/` — DAO layer integration
- `seatflow/events/` — event publishing patterns
- `tests/` — test stubs

---

### 6. `frontend-page-builder`

**Purpose:** Scaffold new Next.js App Router pages with proper layout, state management, and API integration.

**What it does:**
- Creates page route under `src/app/` with proper App Router conventions
- Sets up TanStack Query hooks for data fetching with loading/error states
- Integrates with Zustand auth store where authentication is needed
- Adds AuthGuard if the page requires authentication
- Creates co-located components following the project's component patterns
- Adds proper TypeScript types from `src/types/index.ts`
- Wires up the API client from `src/lib/api-client.ts`

**Trigger:** When adding new user-facing pages or admin views.

**Files it reads/writes:**
- `src/app/{route}/page.tsx` — new page
- `src/app/{route}/loading.tsx` — loading state
- `src/app/{route}/error.tsx` — error boundary
- `src/components/{feature}/` — new components
- `src/hooks/` — custom hooks
- `src/types/index.ts` — type definitions
- `src/lib/api-client.ts` — API integration

---

### 7. `payment-flow-tester`

**Purpose:** End-to-end validation of the complete payment lifecycle from reservation to confirmation.

**What it does:**
- Runs through the full payment flow: create reservation → initiate payment → Stripe webhook → booking confirmation → ticket generation
- Tests both success and failure paths (payment declined, webhook timeout, duplicate webhook)
- Validates idempotency key behavior on retries
- Checks that ticket status transitions are correct at each stage
- Tests mock mode (`PAYMENT_MODE=mock`) vs Stripe sandbox mode

**Trigger:** After payment-related changes, before releases, or when debugging payment issues.

**Files it reads:**
- `seatflow/services/payment/` — payment service
- `seatflow/payment/` — Stripe provider
- `seatflow/services/booking/` — booking service
- `seatflow/services/ticket/` — ticket service
- `seatflow/web/api/payments/views.py` — payment endpoints
- `seatflow/tasks/tasks.py` — payment timeout background task
- `seatflow/config.py` — `PAYMENT_MODE` setting

**Output:** Payment flow test report with step-by-step results and any failures.

---

### 8. `celery-task-builder`

**Purpose:** Create new Celery background tasks following the project's task patterns.

**What it does:**
- Generates a new task module or adds tasks to existing modules in `seatflow/tasks/`
- Follows the pattern: proper logging with `ServiceLogger`, structured error handling, return value conventions
- Configures Celery Beat schedule if periodic execution is needed
- Creates corresponding tests with mocked dependencies
- Updates Flower monitoring if needed

**Trigger:** When adding background processing (e.g., "add a daily report task", "add a notification worker").

**Files it reads/writes:**
- `seatflow/tasks/` — task modules
- `seatflow/tasks/celery_app.py` — Celery configuration
- `seatflow/core/logging/service_logger.py` — logging patterns
- `tests/` — test stubs

---

### 9. `api-doc-generator`

**Purpose:** Generate comprehensive API documentation from endpoint definitions and schemas.

**What it does:**
- Parses all FastAPI routers and Pydantic schemas
- Generates human-readable API documentation beyond what Swagger/ReDoc provides
- Documents: request/response examples, error codes, authentication requirements, rate limits
- Cross-references with frontend API client usage
- Produces markdown documentation suitable for the project docs

**Trigger:** After API changes, for onboarding new developers, or when producing release notes.

**Files it reads:**
- `seatflow/web/api/*/views.py` — all endpoint handlers
- `seatflow/web/api/*/schema.py` — all request/response schemas
- `frontend/src/lib/api-client.ts` — client-side usage
- `frontend/src/services/` — service layer usage

**Output:** Structured API documentation in Markdown format.

---

### 10. `refactor-analyzer`

**Purpose:** Analyze code for refactoring opportunities and architectural drift.

**What it does:**
- Detects violations of the project's layered architecture (e.g., route handlers with business logic, services with raw SQL)
- Identifies duplicated logic across services
- Finds unused imports, dead code, and overly complex functions
- Checks that `ServiceLogger` is used consistently (no bare `print()` or `logging.info()`)
- Validates that DAO methods are used instead of direct SQL in services
- Reports cyclomatic complexity of service methods

**Trigger:** As part of code review, during sprint cleanup, or before major refactors.

**Files it reads:**
- `seatflow/web/api/` — API layer
- `seatflow/services/` — service layer
- `seatflow/db/dao/` — DAO layer
- `seatflow/core/` — core utilities

**Output:** Refactoring opportunity report with priority rankings.

---

## Skills (Slash Commands)

Skills are user-invocable slash commands for common, repeatable operations. They provide quick access to project-specific workflows.

---

### 1. `/make-endpoint`

**Purpose:** Interactive scaffolding of a new API endpoint with all layers.

**Usage:** `/make-endpoint bookings export`

**What it does:**
1. Asks for the module name and operation (CRUD or custom)
2. Generates: schema → DAO method → service method → route handler
3. Registers the route in the application
4. Creates a test stub
5. Optionally generates a migration if a new model is needed

**Approximate time saved:** 30-45 minutes per endpoint.

---

### 2. `/make-model`

**Purpose:** Create a new SQLAlchemy model with migration, DAO, and base CRUD service.

**Usage:** `/make-model Venue name:str capacity:int address:str`

**What it does:**
1. Creates model in `seatflow/db/models/` with UUID PK and timestamp mixins
2. Generates Alembic migration
3. Creates DAO in `seatflow/db/dao/`
4. Creates basic CRUD service in `seatflow/services/`
5. Registers model in `seatflow/db/base.py`
6. Creates test stubs

---

### 3. `/make-page`

**Purpose:** Scaffold a new Next.js page with layout, types, and API integration.

**Usage:** `/make-page /admin/reports`

**What it does:**
1. Creates page, loading, and error files under `src/app/`
2. Asks if authentication is required (adds AuthGuard)
3. Asks if it's an admin page (adds admin layout)
4. Creates TanStack Query hook for data fetching
5. Adds route to navigation if appropriate

---

### 4. `/make-component`

**Purpose:** Create a new React component following project conventions.

**Usage:** `/make-component EventCalendar`

**What it does:**
1. Asks: UI component or feature component?
2. For UI components: creates in `src/components/ui/` following shadcn patterns
3. For feature components: creates in `src/components/{feature}/`
4. Includes proper TypeScript props interface
5. Adds Tailwind styling following the project's design system
6. Optionally adds to the component index for easy import

---

### 5. `/make-task`

**Purpose:** Create a new Celery background task.

**Usage:** `/make-task send_daily_report`

**What it does:**
1. Asks: periodic or event-driven?
2. Creates task in `seatflow/tasks/` with proper logging
3. If periodic: adds to Celery Beat schedule
4. Creates test stub with mocked dependencies
5. Adds `ServiceLogger` logging throughout

---

### 6. `/make-migration`

**Purpose:** Create and review a database migration for safety.

**Usage:** `/make-migration add_venue_table`

**What it does:**
1. Runs `alembic revision --autogenerate`
2. Reviews the generated migration for safety (destructive ops, missing defaults)
3. Shows the review and asks for confirmation
4. Optionally applies with `alembic upgrade head`

---

### 7. `/test-booking-flow`

**Purpose:** Run a complete booking flow integration test.

**Usage:** `/test-booking-flow`

**What it does:**
1. Starts required services (checks Docker status)
2. Creates a test event with tickets
3. Runs through: register → login → reserve ticket → payment → confirmation
4. Validates ticket status at each step
5. Reports success/failure with timing

---

### 8. `/test-concurrency`

**Purpose:** Run flash-sale concurrency tests with configurable parameters.

**Usage:** `/test-concurrency --users 50 --tickets 10`

**What it does:**
1. Sets up test event with limited tickets
2. Launches concurrent booking simulations
3. Monitors Redis lock contention
4. Validates no overselling occurred
5. Reports: success rate, latency distribution, lock wait times

---

### 9. `/check-health`

**Purpose:** Quick health check of all project services.

**Usage:** `/check-health`

**What it does:**
1. Checks Docker containers running (postgres, redis, rabbitmq)
2. Pings backend health endpoint (`/api/v1/health`)
3. Checks Celery worker status via Flower API
4. Checks frontend dev server (if running)
5. Reports status of all services with connection details

---

### 10. `/check-migrations`

**Purpose:** Check database migration status and pending changes.

**Usage:** `/check-migrations`

**What it does:**
1. Runs `alembic current` to show applied migrations
2. Runs `alembic heads` to show latest available
3. Checks for model/migration drift
4. Lists pending migrations
5. Shows if database is up to date or needs upgrade

---

### 11. `/review-payment`

**Purpose:** Audit payment flow for a specific booking or time period.

**Usage:** `/review-payment --booking-id <uuid>`

**What it does:**
1. Looks up booking and associated payment records
2. Validates payment status matches booking status
3. Checks Stripe webhook delivery logs
4. Verifies idempotency key usage
5. Reports any inconsistencies

---

### 12. `/debug-booking`

**Purpose:** Diagnose a specific booking issue by tracing the full lifecycle.

**Usage:** `/debug-booking <booking-id>`

**What it does:**
1. Fetches booking record and status history
2. Checks associated tickets and their statuses
3. Looks up payment record and Stripe status
4. Checks Redis for any active locks on the event
5. Reviews Celery task status for related background jobs
6. Produces a diagnostic report with timeline

---

### 13. `/api-test`

**Purpose:** Run the existing API test suite interactively.

**Usage:** `/api-test` or `/api-test --endpoint auth`

**What it does:**
1. Checks if backend is running
2. Runs the test script at `test_api.sh` (or subset)
3. Can filter by endpoint: auth, events, bookings, payments, chat
4. Shows results with pass/fail per endpoint
5. Reports any failures with details

---

### 14. `/generate-sample-data`

**Purpose:** Seed the database with realistic test data.

**Usage:** `/generate-sample-data --events 5 --users 20`

**What it does:**
1. Creates test user accounts
2. Generates events with varying capacities and schedules
3. Creates ticket inventories for each event
4. Optionally creates bookings and payments
5. Reports what was created with IDs for testing

---

### 15. `/lint-all`

**Purpose:** Run all linters and formatters across the full project.

**Usage:** `/lint-all`

**What it does:**
1. Backend: `ruff check .` + `ruff format --check .`
2. Frontend: `npm run lint` + `npm run type-check`
3. Reports combined results with file-by-file breakdown
4. Optionally auto-fixes with `--fix` flag

---

### 16. `/deploy-check`

**Purpose:** Pre-deployment readiness check for the current branch.

**Usage:** `/deploy-check`

**What it does:**
1. Runs all tests (backend + frontend)
2. Checks for uncommitted changes
3. Validates migrations are up to date
4. Checks environment variables are documented
5. Runs security audit
6. Produces a go/no-go deployment checklist

---

### 17. `/chat-test`

**Purpose:** Test the AI chat assistant integration end-to-end.

**Usage:** `/chat-test`

**What it does:**
1. Checks `SEATFLOW_CHAT_ENABLED` and `SEATFLOW_CHAT_LLM_API_KEY` configuration
2. Creates a test chat session via API
3. Sends test messages and validates responses
4. Checks Celery task processing for async messages
5. Validates session limits (max messages, max sessions per day)
6. Reports response quality and latency

---

### 18. `/docker-manage`

**Purpose:** Manage Docker services for the project.

**Usage:** `/docker-manage up` or `/docker-manage logs redis`

**What it does:**
1. Wraps `docker-compose` commands with project context
2. `up`: starts all services, waits for health checks
3. `down`: stops all services gracefully
4. `logs <service>`: shows recent logs for a service
5. `status`: shows running containers and their health
6. `reset`: tears down and recreates all containers + volumes

---

## Priority Matrix

| Priority | Type | Name | Rationale |
|----------|------|------|-----------|
| **P0 — Critical** | Subagent | `security-auditor` | Payment + auth system requires continuous security validation |
| **P0 — Critical** | Subagent | `booking-concurrency-tester` | Core value proposition is flash-sale reliability |
| **P0 — Critical** | Subagent | `database-reviewer` | Data integrity is paramount for a booking system |
| **P1 — High** | Skill | `/make-endpoint` | Most common development task, saves 30+ min each time |
| **P1 — High** | Skill | `/make-model` | Foundation for all new features |
| **P1 — High** | Skill | `/check-health` | Daily development utility — first thing to run when debugging |
| **P1 — High** | Skill | `/test-booking-flow` | Core business flow validation |
| **P1 — High** | Skill | `/debug-booking` | Primary support/debugging workflow |
| **P2 — Medium** | Subagent | `endpoint-scaffolder` | Automates the full vertical slice creation |
| **P2 — Medium** | Subagent | `service-builder` | Standardizes service layer creation |
| **P2 — Medium** | Subagent | `payment-flow-tester` | Critical path but less frequently changed |
| **P2 — Medium** | Skill | `/make-page` | Frontend scaffolding — high frequency but lower complexity |
| **P2 — Medium** | Skill | `/make-task` | Common pattern for background processing |
| **P2 — Medium** | Skill | `/check-migrations` | Database safety net |
| **P2 — Medium** | Skill | `/docker-manage` | Infrastructure management convenience |
| **P2 — Medium** | Skill | `/generate-sample-data` | Accelerates testing and demo preparation |
| **P3 — Low** | Subagent | `frontend-page-builder` | Less architectural complexity than backend |
| **P3 — Low** | Subagent | `celery-task-builder` | Infrequent task creation |
| **P3 — Low** | Subagent | `api-doc-generator` | Nice-to-have, Swagger/ReDoc already exist |
| **P3 — Low** | Subagent | `refactor-analyzer` | Useful but not time-critical |
| **P3 — Low** | Skill | `/make-component` | Relatively simple task, less scaffolding needed |
| **P3 — Low** | Skill | `/make-migration` | `make migrate` already handles this |
| **P3 — Low** | Skill | `/test-concurrency` | Subsumed by `booking-concurrency-tester` subagent |
| **P3 — Low** | Skill | `/review-payment` | Niche use case |
| **P3 — Low** | Skill | `/api-test` | Existing shell scripts already cover this |
| **P3 — Low** | Skill | `/lint-all` | Makefile + npm scripts already handle this |
| **P3 — Low** | Skill | `/deploy-check` | CI pipeline already handles this |
| **P3 — Low** | Skill | `/chat-test` | Feature is secondary to core booking flow |
| **P3 — Low** | Skill | `/lint-all` | Existing tooling sufficient |

---

## Implementation Notes

### How Subagents Should Be Structured

Each subagent should:
1. **Know the project architecture** — understand the layered pattern (model → DAO → service → route)
2. **Use `ServiceLogger`** — all logging must follow the project's logging standards
3. **Follow async patterns** — all DB operations use async/await
4. **Respect the config** — use `seatflow/config.py` settings, not hardcoded values
5. **Generate tests** — always create corresponding test stubs

### How Skills Should Be Structured

Each skill should:
1. **Be interactive** — ask for clarification when needed, don't assume
2. **Validate prerequisites** — check Docker is running, DB is accessible, etc.
3. **Show what it will do** — preview changes before applying
4. **Be reversible** — prefer creating new files over modifying existing ones
5. **Follow project conventions** — use Make commands, ruff formatting, etc.

### Suggested File Locations

- **Subagent configs**: `.claude/agents/` (one `.md` file per agent)
- **Skill configs**: `.claude/skills/` (one `.md` file per skill)
- **Shared context**: `.claude/CONTEXT.md` (project patterns and conventions)

---

*This document should be updated as the project evolves and new patterns emerge.*
