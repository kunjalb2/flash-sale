# Redis, RabbitMQ, Celery & Flower - Comprehensive Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Redis - In-Memory Data Store](#redis---in-memory-data-store)
3. [RabbitMQ - Message Broker](#rabbitmq---message-broker)
4. [Celery - Distributed Task Queue](#celery---distributed-task-queue)
5. [Flower - Celery Monitoring](#flower---celery-monitoring)
6. [Integration Architecture](#integration-architecture)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Executive Summary

This guide covers four critical infrastructure components used in the SeatFlow flash-sale ticket booking platform:

| Component | Role | Primary Use Cases |
|-----------|------|-------------------|
| **Redis** | In-memory data store | Caching, distributed locking, rate limiting, session storage |
| **RabbitMQ** | Message broker | Event-driven architecture, async communication, task queue broker |
| **Celery** | Distributed task queue | Background jobs, scheduled tasks, async operations |
| **Flower** | Monitoring tool | Real-time Celery monitoring, task inspection, worker management |

These components work together to enable:
- **High performance** through caching
- **Data consistency** through distributed locking
- **Scalability** through async processing
- **Loose coupling** through event-driven architecture

---

## Redis - In-Memory Data Store

### What is Redis?


**Redis** (Remote Dictionary Server) is an open-source, in-memory data structure store that can be used as:
- Database
- Cache
- Message broker
- Streaming engine

**Key Characteristics:**
- **In-memory**: All data stored in RAM for ultra-fast access (sub-millisecond latency)
- **Persistent**: Optional disk persistence for data durability
- **Data structures**: Supports strings, hashes, lists, sets, sorted sets, bitmaps, hyperloglogs, and more
- **Atomic operations**: All operations are atomic
- **Single-threaded**: Uses event loop for concurrency
- **Pub/Sub**: Built-in publish/subscribe messaging

### Redis in SeatFlow

#### 1. Configuration

**Docker Compose Setup:**
```yaml
redis:
  image: redis:7-alpine
  container_name: seatflow-redis
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  ports:
    - "6380:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```


**Application Configuration:**
```python
# seatflow/config.py
class Settings(BaseSettings):
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_user: Optional[str] = None
    redis_pass: Optional[str] = ""
    redis_base: Optional[int] = 0
    redis_max_connections: int = 50
    
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
```

**Connection Initialization:**
```python
# seatflow/services/redis/lifespan.py
def init_redis(app: FastAPI) -> None:
    """Initialize Redis connection pool."""
    app.state.redis_pool = ConnectionPool.from_url(
        str(settings.redis_url),
        max_connections=settings.redis_max_connections,
    )
    app.state.redis = AsyncRedis(
        connection_pool=app.state.redis_pool, 
        decode_responses=True
    )

async def shutdown_redis(app: FastAPI) -> None:
    """Close Redis connections."""
    if hasattr(app.state, "redis") and app.state.redis:
        await app.state.redis.close()
    if hasattr(app.state, "redis_pool") and app.state.redis_pool:
        await app.state.redis_pool.disconnect()
```


#### 2. Use Case #1: Caching

**Purpose**: Reduce database load and improve response times by caching frequently accessed data.

**Implementation:**
```python
# seatflow/core/cache.py
class CacheService:
    CACHE_PREFIX = "seatflow:"
    DEFAULT_TTL_SECONDS = settings.cache_ttl_seconds
    EVENT_DETAIL_TTL_SECONDS = settings.cache_event_detail_ttl_seconds  # 300s
    EVENT_LIST_TTL_SECONDS = settings.cache_event_list_ttl_seconds      # 120s

    def __init__(self, redis_client: AsyncRedis) -> None:
        self.redis = redis_client
        self.enabled = settings.cache_enabled

    def _make_key(self, *parts: Any) -> str:
        """Create namespaced cache key."""
        return self.CACHE_PREFIX + ":".join(str(p) for p in parts)

    async def get(self, key: str) -> Any | None:
        """Get cached value."""
        if not self.enabled:
            return None
        cached = await self.redis.get(self._make_key(key))
        return orjson.loads(cached) if cached else None

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Set cached value with TTL."""
        if not self.enabled:
            return
        ttl = ttl_seconds if ttl_seconds is not None else self.DEFAULT_TTL_SECONDS
        await self.redis.set(self._make_key(key), orjson.dumps(value), ex=ttl)
```


**Cache Patterns Used:**

1. **Event Detail Caching** (TTL: 300 seconds)
```python
async def get_event(self, event_id: UUID) -> Any | None:
    cached = await self.redis.get(self._make_key(f"event:{event_id}"))
    return orjson.loads(cached) if cached else None

async def set_event(self, event_id: UUID, event_data: Any, ttl_seconds: int | None = None) -> None:
    ttl = ttl_seconds if ttl_seconds is not None else self.EVENT_DETAIL_TTL_SECONDS
    await self.redis.set(self._make_key(f"event:{event_id}"), orjson.dumps(event_data), ex=ttl)
```

2. **Event List Caching** (TTL: 120 seconds)
```python
async def get_events_list(self, page: int, size: int, filters: dict[str, Any] | None = None) -> Any | None:
    filter_hash = self._hash_dict(filters) if filters else "none"
    cached = await self.redis.get(self._make_key(f"events:{page}:{size}:{filter_hash}"))
    return orjson.loads(cached) if cached else None
```

3. **Cache Invalidation**
```python
async def invalidate_event(self, event_id: UUID) -> None:
    """Invalidate specific event and all event lists."""
    await self.delete(f"event:{event_id}")
    await self.delete_pattern("events:*")

async def delete_pattern(self, pattern: str) -> int:
    """Delete all keys matching pattern."""
    keys = [k async for k in self.redis.scan_iter(match=self._make_key(pattern))]
    return await self.redis.delete(*keys) if keys else 0
```

**Benefits:**
- Reduces database queries by 70-80%
- Sub-millisecond response times for cached data
- Automatic expiration with TTL
- Pattern-based invalidation for related data


#### 3. Use Case #2: Distributed Locking

**Purpose**: Prevent race conditions in flash-sale scenarios where multiple users try to book the same tickets simultaneously.

**The Problem:**
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

**The Solution: Distributed Lock**

```python
# seatflow/core/lock.py
class DistributedLockService:
    LOCK_PREFIX = "seatflow:lock:"
    DEFAULT_LOCK_TIMEOUT_SECONDS = 10

    def __init__(self, redis_client: AsyncRedis) -> None:
        self.redis = redis_client
        self.enabled = settings.enable_distributed_lock

    def _make_key(self, *parts: Any) -> str:
        return self.LOCK_PREFIX + ":".join(str(p) for p in parts)

    async def _try_acquire(self, lock_key: str, timeout_seconds: int | None) -> bool:
        """Try to acquire lock using Redis SET NX (set if not exists)."""
        if not self.enabled:
            return True
        timeout = timeout_seconds if timeout_seconds is not None else self.DEFAULT_LOCK_TIMEOUT_SECONDS
        # nx=True: Only set if key doesn't exist (atomic operation)
        # ex=timeout: Auto-expire to prevent deadlocks
        return bool(await self.redis.set(self._make_key(lock_key), "locked", nx=True, ex=timeout))
```


**Context Manager Pattern:**
```python
@asynccontextmanager
async def lock(self, lock_key: str, timeout_seconds: int | None = None, wait_seconds: float = 0.0):
    """Acquire lock with automatic release."""
    acquired = await self.acquire(lock_key, timeout_seconds, wait_seconds)
    if not acquired:
        raise LockConflictException(detail="Resource is currently locked. Please try again.")
    try:
        yield  # Execute protected code
    finally:
        await self.release(lock_key)  # Always release lock

@asynccontextmanager
async def event_lock(self, event_id: UUID, timeout_seconds: int | None = None, wait_seconds: float = 0.0):
    """Convenience method for event-specific locks."""
    async with self.lock(f"event:{event_id}", timeout_seconds, wait_seconds):
        yield
```

**Usage in Ticket Reservation:**
```python
# In TicketService
async def reserve_tickets(self, event_id: UUID, ticket_count: int, user_id: str):
    lock_service = DistributedLockService(redis_client)
    
    # Acquire distributed lock for this event (timeout: 310 seconds)
    async with lock_service.event_lock(event_id, timeout_seconds=310):
        # Critical section - only one request can execute this at a time
        tickets = await self.ticket_dao.get_available_tickets(event_id, ticket_count)
        if len(tickets) < ticket_count:
            raise InsufficientTicketsException()
        
        # Reserve tickets atomically
        await self.ticket_dao.reserve_tickets([t.id for t in tickets], user_id)
        return tickets
```

**Key Features:**
- **Atomic**: `SET NX` is atomic in Redis
- **Auto-expiration**: Prevents deadlocks if process crashes
- **Context manager**: Guarantees lock release with `finally`
- **Distributed**: Works across multiple API server instances


#### 4. Use Case #3: Rate Limiting

**Purpose**: Protect API from abuse and ensure fair resource allocation using sliding window algorithm.

**Implementation:**
```python
# seatflow/core/rate_limiter.py
@dataclass
class RateLimitConfig:
    requests: int           # Max requests allowed
    window_seconds: int     # Time window in seconds
    key_prefix: str         # Redis key prefix

class RateLimiter:
    # Predefined rate limit configurations
    LOGIN = RateLimitConfig(requests=5, window_seconds=60, key_prefix="login")
    REGISTER = RateLimitConfig(requests=3, window_seconds=300, key_prefix="register")
    RESERVATION = RateLimitConfig(requests=10, window_seconds=60, key_prefix="reservation")
    DEFAULT = RateLimitConfig(requests=60, window_seconds=60, key_prefix="default")

    def __init__(self, redis: AsyncRedis, enabled: bool = True) -> None:
        self.redis = redis
        self.enabled = enabled

    async def check_rate_limit(self, identifier: str, config: RateLimitConfig) -> None:
        if not self.enabled:
            return
        
        key = f"ratelimit:{config.key_prefix}:{identifier}"
        current_time = int(time.time() * 1000)  # Milliseconds
        window_start = current_time - (config.window_seconds * 1000)

        # Remove old entries outside the sliding window
        await self.redis.zremrangebyscore(key, 0, window_start)
        
        # Count requests in current window
        request_count = await self.redis.zcard(key)

        if request_count >= config.requests:
            ttl = await self.redis.ttl(key)
            raise RateLimitException(
                detail=f"Rate limit exceeded. Max {config.requests} requests per {config.window_seconds}s. Try again in {max(0, ttl)}s."
            )

        # Add current request to sorted set
        pipe = self.redis.pipeline()
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, config.window_seconds)
        await pipe.execute()
```


**Sliding Window Algorithm Visualization:**
```
Time Window: 60 seconds
Max Requests: 5

Current Time: 1000ms
Window: [940ms - 1000ms]

Sorted Set (Redis ZSET):
Score (timestamp) | Member
------------------|--------
945               | req_1
960               | req_2
975               | req_3
990               | req_4
1000              | req_5  ← Current request

Request count: 5 → RATE LIMIT EXCEEDED

After 15ms (at 1015ms):
Window: [955ms - 1015ms]
- req_1 (945ms) removed (outside window)
- Request count: 4 → ALLOWED
```

**Usage in API Endpoints:**
```python
# FastAPI dependency injection
def make_rate_limit_check(config: RateLimitConfig):
    async def check(request: Request, limiter: Annotated[RateLimiter, Depends(get_rate_limiter)]) -> None:
        identifier = get_client_identifier(request)
        await limiter.check_rate_limit(identifier, config)
    return check

# Type aliases for convenience
LoginRateLimit = Annotated[None, Depends(make_rate_limit_check(RateLimiter.LOGIN))]
ReservationRateLimit = Annotated[None, Depends(make_rate_limit_check(RateLimiter.RESERVATION))]

# Apply to endpoint
@router.post("/reservations", dependencies=[Depends(make_rate_limit_check(RateLimiter.RESERVATION))])
async def create_reservation(...):
    # Only 10 requests per minute allowed per user/IP
    pass
```

**Benefits:**
- **Sliding window**: More accurate than fixed window
- **Per-user/IP**: Identifies users by JWT or IP address
- **Automatic cleanup**: Old entries auto-removed
- **Configurable**: Different limits for different endpoints


#### 5. Use Case #4: Celery Result Backend

**Purpose**: Store Celery task results for retrieval and monitoring.

**Configuration:**
```python
# seatflow/config.py
celery_result_backend: str = "redis://localhost:6379/1"
```

**How it works:**
- Celery stores task results in Redis with task ID as key
- Results include: status, return value, traceback (if failed)
- Configurable expiration time
- Enables task result retrieval and monitoring

**Redis Key Pattern:**
```
celery-task-meta-{task_id}
```

---

### Redis Data Structures Used in SeatFlow

| Data Structure | Use Case | Example Key |
|----------------|----------|-------------|
| **String** | Cache values, locks | `seatflow:event:123`, `seatflow:lock:event:456` |
| **Sorted Set (ZSET)** | Rate limiting (sliding window) | `ratelimit:reservation:user:789` |
| **Hash** | Celery task metadata | `celery-task-meta-abc123` |

---

### Redis Commands Reference

**Common Operations:**
```bash
# Connect to Redis CLI
docker exec -it seatflow-redis redis-cli

# View all keys
KEYS *

# Get value
GET seatflow:event:123

# Check if key exists
EXISTS seatflow:lock:event:456

# Get TTL (time to live)
TTL seatflow:event:123

# Delete key
DEL seatflow:event:123

# View sorted set (rate limiting)
ZRANGE ratelimit:reservation:user:789 0 -1 WITHSCORES

# Count sorted set members
ZCARD ratelimit:reservation:user:789

# Monitor real-time commands
MONITOR
```


---

## RabbitMQ - Message Broker

### What is RabbitMQ?

**RabbitMQ** is an open-source message broker that implements the Advanced Message Queuing Protocol (AMQP). It acts as a middleman for messaging, allowing applications to communicate asynchronously.

**Key Concepts:**

1. **Producer**: Application that sends messages
2. **Consumer**: Application that receives messages
3. **Queue**: Buffer that stores messages
4. **Exchange**: Routes messages to queues based on routing rules
5. **Binding**: Link between exchange and queue
6. **Routing Key**: Message attribute used for routing

**Exchange Types:**
- **Direct**: Routes to queues with exact routing key match
- **Topic**: Routes based on pattern matching (wildcards)
- **Fanout**: Broadcasts to all bound queues
- **Headers**: Routes based on message headers

**Benefits:**
- **Decoupling**: Services don't need to know about each other
- **Reliability**: Messages persisted to disk
- **Scalability**: Distribute load across multiple consumers
- **Flexibility**: Complex routing patterns

### RabbitMQ in SeatFlow

#### 1. Configuration

**Docker Compose Setup:**
```yaml
rabbitmq:
  image: rabbitmq:4.0-management-alpine
  container_name: seatflow-rabbitmq
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
  ports:
    - "5673:5672"      # AMQP protocol
    - "15673:15672"    # Management UI
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```


**Application Configuration:**
```python
# seatflow/config.py
class Settings(BaseSettings):
    rabbit_host: str = "localhost"
    rabbit_port: int = 5672
    rabbit_user: str = "guest"
    rabbit_pass: str = "guest"
    rabbit_vhost: str = "/"
    rabbit_pool_size: int = 2
    rabbit_channel_pool_size: int = 10
    
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
```

**Connection Pool Initialization:**
```python
# seatflow/services/rabbit/lifespan.py
def init_rabbit(app: FastAPI) -> None:
    """Initialize RabbitMQ connection and channel pools."""
    
    async def get_connection() -> AbstractRobustConnection:
        return await aio_pika.connect_robust(str(settings.rabbit_url))

    # Connection pool (max 2 connections)
    connection_pool: Pool[AbstractRobustConnection] = Pool(
        get_connection, 
        max_size=settings.rabbit_pool_size
    )

    async def get_channel() -> AbstractChannel:
        async with connection_pool.acquire() as connection:
            return await connection.channel()

    # Channel pool (max 10 channels)
    channel_pool: Pool[aio_pika.Channel] = Pool(
        get_channel, 
        max_size=settings.rabbit_channel_pool_size
    )

    app.state.rmq_pool = connection_pool
    app.state.rmq_channel_pool = channel_pool
```


#### 2. Event-Driven Architecture

**Domain Events in SeatFlow:**

```python
# seatflow/events/models.py
class EventType(str, Enum):
    """Domain event types."""
    RESERVATION_CREATED = "reservation.created"
    PAYMENT_COMPLETED = "payment.completed"
    TICKET_CONFIRMED = "ticket.confirmed"
    RESERVATION_EXPIRED = "reservation.expired"
    RESERVATION_CANCELLED = "reservation.cancelled"
    PAYMENT_FAILED = "payment.failed"

class DomainEvent:
    """Base class for domain events."""
    def __init__(
        self,
        event_type: EventType,
        aggregate_id: UUID,
        aggregate_type: str,
        data: dict[str, Any],
        user_id: UUID | None = None,
        correlation_id: str | None = None,
    ) -> None:
        self.event_type = event_type
        self.aggregate_id = aggregate_id
        self.aggregate_type = aggregate_type
        self.data = data
        self.user_id = user_id
        self.correlation_id = correlation_id
        self.timestamp = datetime.now()
        self.id = f"{event_type.value}:{aggregate_id}:{int(self.timestamp.timestamp())}"
```

**Event Examples:**

1. **ReservationCreated Event:**
```python
class ReservationCreated(DomainEvent):
    def __init__(
        self,
        reservation_id: UUID,
        user_id: UUID,
        event_id: UUID,
        ticket_count: int,
        total_amount: float,
        expires_at: datetime,
        correlation_id: str | None = None,
    ) -> None:
        data = {
            "event_id": str(event_id),
            "ticket_count": ticket_count,
            "total_amount": total_amount,
            "expires_at": expires_at.isoformat(),
        }
        super().__init__(
            event_type=EventType.RESERVATION_CREATED,
            aggregate_id=reservation_id,
            aggregate_type="booking",
            data=data,
            user_id=user_id,
            correlation_id=correlation_id,
        )
```


#### 3. Event Publisher Implementation

```python
# seatflow/events/rabbitmq_publisher.py
class RabbitMQEventPublisher(EventPublisher):
    """RabbitMQ implementation of event publisher."""

    def __init__(self) -> None:
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.RobustChannel | None = None
        self._exchange: aio_pika.RobustExchange | None = None
        self._exchange_name = "seatflow.events"
        self._connected = False

    async def connect(self) -> None:
        """Establish connection to RabbitMQ."""
        if self._connected:
            return

        url = (
            f"amqp://{settings.rabbit_user}:{settings.rabbit_pass}"
            f"@{settings.rabbit_host}:{settings.rabbit_port}{settings.rabbit_vhost}"
        )
        self._connection = await aio_pika.connect_robust(url)
        self._channel = await self._connection.channel()

        # Declare topic exchange for event routing
        self._exchange = await self._channel.declare_exchange(
            name=self._exchange_name,
            type=ExchangeType.TOPIC,  # Pattern-based routing
            durable=True,              # Survive broker restart
        )

        self._connected = True
        logger.info("RabbitMQ event publisher connected")

    async def publish(self, event: DomainEvent, routing_key: str | None = None) -> None:
        """Publish a domain event to RabbitMQ."""
        if not self._connected:
            await self.connect()

        routing_key = routing_key or f"{event.event_type.value}"

        message = Message(
            body=json.dumps(event.to_dict()).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # Persist to disk
            headers={
                "event_type": event.event_type.value,
                "aggregate_id": str(event.aggregate_id),
                "aggregate_type": event.aggregate_type,
                "user_id": str(event.user_id) if event.user_id else None,
                "correlation_id": event.correlation_id,
            },
        )

        await self._exchange.publish(message, routing_key=routing_key)
```


#### 4. Publishing Events in Business Logic

**Example: Publishing ReservationCreated Event**

```python
# In BookingService
async def create_reservation(self, user_id: UUID, event_id: UUID, ticket_count: int):
    # 1. Create booking in database
    booking = await self.booking_dao.create({
        "user_id": user_id,
        "event_id": event_id,
        "ticket_count": ticket_count,
        "status": BookingStatus.reserved,
        "expires_at": datetime.now() + timedelta(seconds=300),
    })
    
    # 2. Publish domain event
    event_publisher = await get_event_publisher()
    await event_publisher.publish(
        ReservationCreated(
            reservation_id=booking.id,
            user_id=user_id,
            event_id=event_id,
            ticket_count=ticket_count,
            total_amount=float(booking.total_amount),
            expires_at=booking.expires_at,
        )
    )
    
    return booking
```

**Event Flow Diagram:**
```
┌─────────────────┐
│ BookingService  │
│ create_reservation()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Booking  │
│ in PostgreSQL   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Publish Event   │
│ to RabbitMQ     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ RabbitMQ Exchange               │
│ Name: seatflow.events           │
│ Type: TOPIC                     │
│ Routing Key: reservation.created│
└────────┬────────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │Queue 1 │    │Queue 2 │    │Queue 3 │
    │Email   │    │Analytics│   │Audit   │
    │Service │    │Service  │   │Log     │
    └────────┘    └────────┘    └────────┘
```


#### 5. RabbitMQ as Celery Broker

**Configuration:**
```python
# seatflow/config.py
celery_broker_url: str = "amqp://guest:guest@localhost:5672//"
```

**How it works:**
- Celery uses RabbitMQ to queue tasks
- Workers consume tasks from queues
- Results stored in Redis backend
- Supports task priorities, routing, and retries

**Queue Structure:**
```
RabbitMQ Broker
├── celery (default queue)
│   ├── send_booking_confirmation_email
│   ├── cleanup_expired_reservations
│   └── cleanup_failed_payments
└── celery.beat (scheduled tasks queue)
```

---

### RabbitMQ Management UI

**Access:** http://localhost:15673
**Credentials:** guest / guest

**Features:**
- View exchanges, queues, and bindings
- Monitor message rates
- Publish test messages
- View connections and channels
- Configure policies and parameters

**Useful Commands:**
```bash
# List queues
docker exec seatflow-rabbitmq rabbitmqctl list_queues

# List exchanges
docker exec seatflow-rabbitmq rabbitmqctl list_exchanges

# List bindings
docker exec seatflow-rabbitmq rabbitmqctl list_bindings

# Purge queue
docker exec seatflow-rabbitmq rabbitmqctl purge_queue celery

# Check cluster status
docker exec seatflow-rabbitmq rabbitmqctl cluster_status
```

---

## Celery - Distributed Task Queue

### What is Celery?

**Celery** is an asynchronous task queue/job queue based on distributed message passing. It's focused on real-time operation but supports scheduling as well.


**Key Concepts:**

1. **Task**: A unit of work (Python function decorated with `@celery_app.task`)
2. **Worker**: Process that executes tasks
3. **Broker**: Message transport (RabbitMQ in our case)
4. **Backend**: Stores task results (Redis in our case)
5. **Beat**: Scheduler for periodic tasks

**Architecture:**
```
┌──────────────┐
│   FastAPI    │
│  Application │
└──────┬───────┘
       │ 1. Enqueue task
       ▼
┌──────────────┐
│   RabbitMQ   │
│   (Broker)   │
└──────┬───────┘
       │ 2. Deliver task
       ▼
┌──────────────┐
│    Celery    │
│    Worker    │
└──────┬───────┘
       │ 3. Store result
       ▼
┌──────────────┐
│    Redis     │
│  (Backend)   │
└──────────────┘
```

**Benefits:**
- **Async execution**: Don't block API responses
- **Scalability**: Add more workers to handle load
- **Reliability**: Retry failed tasks automatically
- **Scheduling**: Run tasks at specific times or intervals
- **Monitoring**: Track task status and performance

### Celery in SeatFlow

#### 1. Configuration

```python
# seatflow/tasks/celery_app.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "seatflow",
    broker=settings.celery_broker_url,      # RabbitMQ
    backend=settings.celery_result_backend,  # Redis
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)
```


#### 2. Scheduled Tasks (Celery Beat)

**Beat Schedule Configuration:**
```python
celery_app.conf.beat_schedule = {
    "cleanup-expired-reservations-every-minute": {
        "task": "seatflow.tasks.tasks.cleanup_expired_reservations",
        "schedule": crontab(minute="*"),  # Every minute
    },
    "cleanup-failed-payments-every-5-minutes": {
        "task": "seatflow.tasks.tasks.cleanup_failed_payments",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
}
```

**Crontab Schedule Examples:**
```python
# Every minute
crontab(minute="*")

# Every 5 minutes
crontab(minute="*/5")

# Every hour at minute 0
crontab(minute=0, hour="*")

# Every day at midnight
crontab(minute=0, hour=0)

# Every Monday at 9 AM
crontab(minute=0, hour=9, day_of_week=1)

# Every 1st of month at midnight
crontab(minute=0, hour=0, day_of_month=1)
```

#### 3. Task Implementations

**Task #1: Send Booking Confirmation Email**

```python
@celery_app.task(name="seatflow.tasks.tasks.send_booking_confirmation_email")
def send_booking_confirmation_email(
    user_id: str,
    booking_id: str,
    event_id: str,
    event_name: str,
    event_date: str,
    event_venue: str,
    ticket_count: int,
    total_amount: float,
    user_email: str,
) -> dict[str, str]:
    """Send booking confirmation email (mock implementation)."""
    ServiceLogger.log(
        service="EmailService",
        operation="send_booking_confirmation",
        user_id=user_id,
        entity_id=booking_id,
        recipient=user_email,
        event_name=event_name,
    )
    
    # In production, integrate with email service (SendGrid, AWS SES, etc.)
    return {"status": "sent", "user_id": user_id, "booking_id": booking_id}
```


**Task #2: Cleanup Expired Reservations**

```python
@celery_app.task(name="seatflow.tasks.tasks.cleanup_expired_reservations")
def cleanup_expired_reservations() -> dict[str, int]:
    """Background task to clean up expired reservations and release tickets."""
    
    import asyncio
    import nest_asyncio
    nest_asyncio.apply()  # Allow nested event loops

    async def _cleanup() -> int:
        # Create new database session for this task
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        
        engine = create_async_engine(
            settings.database_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        
        session_maker = async_sessionmaker(engine, expire_on_commit=False)
        
        try:
            async with session_maker() as session:
                booking_repo = BookingDAO(session)
                ticket_service = TicketService(session)
                
                # Find and expire reservations
                expire_time = datetime.now()
                count = await booking_repo.expire_reservations(expire_time)
                
                # Release tickets for expired bookings
                expired_bookings, _ = await booking_repo.get_bookings_before(expire_time)
                for booking in expired_bookings:
                    if booking.status == BookingStatus.expired:
                        tickets = await ticket_service.get_user_reservations(str(booking.user_id))
                        booking_tickets = [t for t in tickets if t.event_id == booking.event_id]
                        if booking_tickets:
                            ticket_ids = [t.id for t in booking_tickets]
                            await ticket_service.release_tickets(ticket_ids)
                
                await session.commit()
                return count
        finally:
            await engine.dispose()
    
    count = asyncio.run(_cleanup())
    return {"expired_count": count, "status": "completed"}
```


**Task #3: Cleanup Failed Payments**

```python
@celery_app.task(name="seatflow.tasks.tasks.cleanup_failed_payments")
def cleanup_failed_payments() -> dict[str, int]:
    """Background task to clean up failed/abandoned payments."""
    
    async def _cleanup() -> dict[str, int]:
        # Similar pattern to cleanup_expired_reservations
        timeout_threshold = datetime.now() - timedelta(minutes=15)
        pending_payments = await payment_repo.get_pending_payments(timeout_threshold)
        
        cleaned_payments = 0
        expired_bookings = 0
        
        for payment in pending_payments:
            payment.status = PaymentStatus.failed
            payment.failure_reason = "Payment timed out after 15 minutes"
            cleaned_payments += 1
            
            if payment.booking and payment.booking.status == BookingStatus.reserved:
                booking = payment.booking
                booking.status = BookingStatus.expired
                expired_bookings += 1
                
                # Release tickets
                await ticket_service.release_tickets(ticket_ids)
                await cache.invalidate_event(booking.event_id)
        
        await session.commit()
        return {"cleaned_payments": cleaned_payments, "expired_bookings": expired_bookings}
    
    result = asyncio.run(_cleanup())
    return {**result, "status": "completed"}
```

#### 4. Triggering Tasks from API

**Immediate Execution:**
```python
# Trigger task immediately
send_booking_confirmation_email.delay(
    user_id=str(user_id),
    booking_id=str(booking_id),
    event_id=str(event_id),
    event_name=event_name,
    # ... other params
)
```

**Delayed Execution:**
```python
# Trigger task after 5 seconds
send_booking_confirmation_email.apply_async(
    args=[...],
    countdown=5,
)
```

**Scheduled Execution:**
```python
from datetime import datetime, timedelta

# Trigger task at specific time
eta = datetime.now() + timedelta(hours=1)
send_booking_confirmation_email.apply_async(
    args=[...],
    eta=eta,
)
```


#### 5. Docker Services

**Celery Worker:**
```yaml
celery_worker:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: seatflow-celery-worker
  command: celery -A seatflow.tasks.celery_app worker --loglevel=info --concurrency=4
  depends_on:
    - postgres
    - redis
    - rabbitmq
  environment:
    - SEATFLOW_DB_HOST=postgres
    - SEATFLOW_REDIS_HOST=redis
    - SEATFLOW_RABBIT_HOST=rabbitmq
```

**Celery Beat (Scheduler):**
```yaml
celery_beat:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: seatflow-celery-beat
  command: celery -A seatflow.tasks.celery_app beat --loglevel=info
  depends_on:
    - postgres
    - redis
    - rabbitmq
```

**Key Parameters:**
- `--concurrency=4`: Run 4 worker processes
- `--loglevel=info`: Log level (debug, info, warning, error)
- `-A seatflow.tasks.celery_app`: Application module path

#### 6. Celery CLI Commands

```bash
# Start worker
celery -A seatflow.tasks.celery_app worker --loglevel=info

# Start beat scheduler
celery -A seatflow.tasks.celery_app beat --loglevel=info

# Inspect active tasks
celery -A seatflow.tasks.celery_app inspect active

# Inspect scheduled tasks
celery -A seatflow.tasks.celery_app inspect scheduled

# Inspect registered tasks
celery -A seatflow.tasks.celery_app inspect registered

# Purge all tasks
celery -A seatflow.tasks.celery_app purge

# Get worker stats
celery -A seatflow.tasks.celery_app inspect stats

# Revoke task
celery -A seatflow.tasks.celery_app revoke <task_id>
```


---

## Flower - Celery Monitoring

### What is Flower?

**Flower** is a real-time web-based monitoring tool for Celery. It provides a beautiful UI to monitor and manage Celery clusters.

**Key Features:**
- Real-time monitoring of Celery workers
- Task progress and history
- Task details (arguments, results, tracebacks)
- Worker statistics and control
- Broker monitoring
- HTTP API for programmatic access

### Flower in SeatFlow

#### 1. Installation & Configuration

**Already included in dependencies:**
```toml
# pyproject.toml
dependencies = [
    "flower>=2.0.1",
]
```

#### 2. Running Flower

**Standalone:**
```bash
celery -A seatflow.tasks.celery_app flower --port=5555
```

**With Docker:**
```yaml
flower:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: seatflow-flower
  command: celery -A seatflow.tasks.celery_app flower --port=5555
  ports:
    - "5555:5555"
  depends_on:
    - redis
    - rabbitmq
  environment:
    - SEATFLOW_REDIS_HOST=redis
    - SEATFLOW_RABBIT_HOST=rabbitmq
```

**Access:** http://localhost:5555

#### 3. Flower UI Features

**Dashboard:**
- Active workers count
- Task success/failure rates
- Task execution time graphs
- Worker CPU and memory usage

**Tasks Tab:**
- List of all tasks (active, scheduled, completed, failed)
- Filter by state, name, worker
- Task details: arguments, result, traceback, runtime
- Retry or revoke tasks


**Workers Tab:**
- List of active workers
- Worker status (online/offline)
- Active tasks per worker
- Worker configuration
- Shutdown or restart workers

**Broker Tab:**
- Queue statistics
- Message rates
- Queue lengths

**Monitor Tab:**
- Real-time task stream
- Live updates of task execution

#### 4. Flower HTTP API

**Get worker stats:**
```bash
curl http://localhost:5555/api/workers
```

**Get task info:**
```bash
curl http://localhost:5555/api/task/info/<task_id>
```

**Get task result:**
```bash
curl http://localhost:5555/api/task/result/<task_id>
```

**Revoke task:**
```bash
curl -X POST http://localhost:5555/api/task/revoke/<task_id>
```

**List tasks:**
```bash
curl http://localhost:5555/api/tasks
```

#### 5. Authentication (Optional)

**Basic Auth:**
```bash
celery -A seatflow.tasks.celery_app flower \
    --basic_auth=user1:password1,user2:password2
```

**OAuth (Google):**
```bash
celery -A seatflow.tasks.celery_app flower \
    --auth=.*@example\.com \
    --oauth2_key=<google_oauth2_key> \
    --oauth2_secret=<google_oauth2_secret> \
    --oauth2_redirect_uri=http://localhost:5555/login
```

---

## Integration Architecture

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
│                    POST /api/v1/reservations                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Application                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Rate Limiter │→ │   Booking    │→ │   Ticket     │          │
│  │   (Redis)    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────┬────────────────────┬────────────────────┬──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Redis          │  │ PostgreSQL     │  │ Redis Lock     │
│ Rate Limit     │  │ Create Booking │  │ Acquire Lock   │
│ Check          │  │ Reserve Tickets│  │ (Distributed)  │
└────────────────┘  └────────┬───────┘  └────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Event Publisher                             │
│                    (RabbitMQ Publisher)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RabbitMQ                                 │
│                   Exchange: seatflow.events                      │
│                   Routing: reservation.created                   │
└────────┬────────────────────────────────────────────────────────┘
         │
         ├─────────────────────┬─────────────────────┐
         ▼                     ▼                     ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Celery Worker  │  │ Analytics      │  │ Audit Log      │
│ Send Email     │  │ Service        │  │ Service        │
└────────┬───────┘  └────────────────┘  └────────────────┘
         │
         ▼
┌────────────────┐
│ Redis          │
│ Task Result    │
└────────────────┘
```


### Component Interactions

| Component | Interacts With | Purpose |
|-----------|----------------|---------|
| **FastAPI** | Redis, PostgreSQL, RabbitMQ | Main application, handles HTTP requests |
| **Redis** | FastAPI, Celery | Caching, locking, rate limiting, task results |
| **PostgreSQL** | FastAPI, Celery | Persistent data storage |
| **RabbitMQ** | FastAPI, Celery | Message broker for events and tasks |
| **Celery Worker** | RabbitMQ, Redis, PostgreSQL | Execute background tasks |
| **Celery Beat** | RabbitMQ, Redis | Schedule periodic tasks |
| **Flower** | Celery, RabbitMQ, Redis | Monitor Celery workers and tasks |

---

## Best Practices

### Redis Best Practices

1. **Use Connection Pooling**
   ```python
   # Good: Reuse connections
   pool = ConnectionPool.from_url(redis_url, max_connections=50)
   redis = AsyncRedis(connection_pool=pool)
   
   # Bad: Create new connection each time
   redis = AsyncRedis.from_url(redis_url)  # Don't do this repeatedly
   ```

2. **Set Appropriate TTLs**
   ```python
   # Always set expiration to prevent memory leaks
   await redis.set(key, value, ex=300)  # 5 minutes
   
   # Don't store data indefinitely
   await redis.set(key, value)  # Bad: No expiration
   ```

3. **Use Namespaced Keys**
   ```python
   # Good: Clear namespace
   key = "seatflow:event:123"
   
   # Bad: Generic key
   key = "event123"
   ```

4. **Handle Connection Failures**
   ```python
   try:
       await redis.set(key, value)
   except redis.ConnectionError:
       logger.error("Redis connection failed")
       # Fallback to database or return error
   ```

5. **Monitor Memory Usage**
   ```bash
   # Check memory usage
   redis-cli INFO memory
   
   # Set max memory and eviction policy
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```


### RabbitMQ Best Practices

1. **Use Durable Queues and Persistent Messages**
   ```python
   # Declare durable exchange
   exchange = await channel.declare_exchange(
       name="seatflow.events",
       type=ExchangeType.TOPIC,
       durable=True,  # Survive broker restart
   )
   
   # Send persistent messages
   message = Message(
       body=data,
       delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
   )
   ```

2. **Use Connection Pooling**
   ```python
   # Good: Connection pool
   connection_pool = Pool(get_connection, max_size=2)
   channel_pool = Pool(get_channel, max_size=10)
   
   # Bad: Create connection for each operation
   connection = await aio_pika.connect(url)  # Don't do this repeatedly
   ```

3. **Handle Message Acknowledgments**
   ```python
   async def consume_messages(queue):
       async with queue.iterator() as queue_iter:
           async for message in queue_iter:
               try:
                   await process_message(message)
                   await message.ack()  # Acknowledge success
               except Exception as e:
                   await message.nack(requeue=True)  # Requeue on failure
   ```

4. **Set Message TTL**
   ```python
   # Prevent messages from accumulating indefinitely
   await channel.declare_queue(
       name="my_queue",
       arguments={"x-message-ttl": 3600000}  # 1 hour in milliseconds
   )
   ```

5. **Monitor Queue Lengths**
   ```bash
   # Check queue lengths regularly
   rabbitmqctl list_queues name messages
   
   # Set alerts for queue buildup
   ```

### Celery Best Practices

1. **Use Task Names Explicitly**
   ```python
   # Good: Explicit name
   @celery_app.task(name="seatflow.tasks.send_email")
   def send_email():
       pass
   
   # Bad: Auto-generated name (breaks on refactoring)
   @celery_app.task
   def send_email():
       pass
   ```


2. **Set Task Time Limits**
   ```python
   celery_app.conf.update(
       task_time_limit=30 * 60,  # Hard limit: 30 minutes
       task_soft_time_limit=25 * 60,  # Soft limit: 25 minutes
   )
   ```

3. **Use Idempotent Tasks**
   ```python
   # Good: Idempotent (can run multiple times safely)
   @celery_app.task
   def update_user_status(user_id, status):
       user = get_user(user_id)
       if user.status != status:
           user.status = status
           user.save()
   
   # Bad: Not idempotent
   @celery_app.task
   def increment_counter(user_id):
       user = get_user(user_id)
       user.counter += 1  # Running twice doubles the increment
       user.save()
   ```

4. **Handle Task Failures**
   ```python
   @celery_app.task(bind=True, max_retries=3)
   def send_email(self, email_data):
       try:
           # Send email
           pass
       except Exception as exc:
           # Retry with exponential backoff
           raise self.retry(exc=exc, countdown=2 ** self.request.retries)
   ```

5. **Create New Database Sessions in Tasks**
   ```python
   # Good: New session per task
   @celery_app.task
   def process_booking(booking_id):
       engine = create_async_engine(settings.database_url)
       session_maker = async_sessionmaker(engine)
       async with session_maker() as session:
           # Process booking
           pass
   
   # Bad: Reuse application session (causes connection issues)
   ```

6. **Monitor Task Performance**
   ```python
   # Enable task tracking
   celery_app.conf.task_track_started = True
   
   # Use Flower for monitoring
   # Access: http://localhost:5555
   ```


---

## Troubleshooting

### Redis Issues

**Problem: Connection Refused**
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs seatflow-redis

# Test connection
docker exec -it seatflow-redis redis-cli ping
# Expected: PONG
```

**Problem: Out of Memory**
```bash
# Check memory usage
docker exec -it seatflow-redis redis-cli INFO memory

# Solution: Increase maxmemory or change eviction policy
# In docker-compose.yml:
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

**Problem: Slow Performance**
```bash
# Check slow log
docker exec -it seatflow-redis redis-cli SLOWLOG GET 10

# Monitor commands in real-time
docker exec -it seatflow-redis redis-cli MONITOR
```

**Problem: Keys Not Expiring**
```bash
# Check TTL
docker exec -it seatflow-redis redis-cli TTL seatflow:event:123

# -1 means no expiration set
# -2 means key doesn't exist
# Positive number is seconds until expiration
```

### RabbitMQ Issues

**Problem: Connection Refused**
```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Check RabbitMQ logs
docker logs seatflow-rabbitmq

# Check cluster status
docker exec seatflow-rabbitmq rabbitmqctl cluster_status
```

**Problem: Queue Buildup**
```bash
# Check queue lengths
docker exec seatflow-rabbitmq rabbitmqctl list_queues

# Purge queue if needed
docker exec seatflow-rabbitmq rabbitmqctl purge_queue celery

# Check consumer count
docker exec seatflow-rabbitmq rabbitmqctl list_queues name consumers
```


**Problem: Messages Not Being Consumed**
```bash
# Check if workers are connected
docker exec seatflow-rabbitmq rabbitmqctl list_consumers

# Check exchange bindings
docker exec seatflow-rabbitmq rabbitmqctl list_bindings

# Restart Celery workers
docker restart seatflow-celery-worker
```

**Problem: Disk Space Full**
```bash
# Check disk usage
docker exec seatflow-rabbitmq rabbitmqctl status

# Set disk free limit (in docker-compose.yml)
environment:
  - RABBITMQ_DISK_FREE_LIMIT=2GB
```

### Celery Issues

**Problem: Tasks Not Executing**
```bash
# Check if workers are running
docker ps | grep celery-worker

# Check worker logs
docker logs seatflow-celery-worker

# Inspect active workers
celery -A seatflow.tasks.celery_app inspect active

# Check registered tasks
celery -A seatflow.tasks.celery_app inspect registered
```

**Problem: Tasks Stuck in Pending**
```bash
# Check broker connection
celery -A seatflow.tasks.celery_app inspect ping

# Check if workers are consuming
celery -A seatflow.tasks.celery_app inspect stats

# Restart workers
docker restart seatflow-celery-worker
```

**Problem: Task Failures**
```bash
# View failed tasks in Flower
# Access: http://localhost:5555

# Check task traceback
celery -A seatflow.tasks.celery_app result <task_id>

# Retry failed task
from seatflow.tasks.celery_app import celery_app
celery_app.send_task('task_name', args=[...])
```

**Problem: Beat Not Scheduling Tasks**
```bash
# Check if beat is running
docker ps | grep celery-beat

# Check beat logs
docker logs seatflow-celery-beat

# Verify beat schedule
celery -A seatflow.tasks.celery_app inspect scheduled

# Delete beat schedule file and restart
rm celerybeat-schedule
docker restart seatflow-celery-beat
```


**Problem: Memory Leaks in Workers**
```bash
# Set max tasks per child to restart workers periodically
celery_app.conf.worker_max_tasks_per_child = 1000

# Monitor worker memory
docker stats seatflow-celery-worker

# Restart workers if memory is high
docker restart seatflow-celery-worker
```

### Flower Issues

**Problem: Flower Not Accessible**
```bash
# Check if Flower is running
docker ps | grep flower

# Check Flower logs
docker logs seatflow-flower

# Restart Flower
docker restart seatflow-flower

# Access Flower
# URL: http://localhost:5555
```

**Problem: Flower Shows No Workers**
```bash
# Check broker connection
# Flower needs access to RabbitMQ and Redis

# Verify environment variables
docker exec seatflow-flower env | grep REDIS
docker exec seatflow-flower env | grep RABBIT

# Restart Flower after fixing config
docker restart seatflow-flower
```

---

## Summary

### Quick Reference

| Component | Port | Purpose | Key Features |
|-----------|------|---------|--------------|
| **Redis** | 6379 | In-memory data store | Caching, locking, rate limiting |
| **RabbitMQ** | 5672 (AMQP)<br>15672 (UI) | Message broker | Event-driven architecture, task queue |
| **Celery Worker** | - | Task executor | Background jobs, async processing |
| **Celery Beat** | - | Task scheduler | Periodic tasks, cron jobs |
| **Flower** | 5555 | Monitoring | Real-time Celery monitoring |

### Key Takeaways

1. **Redis** provides ultra-fast data access for caching, distributed locking, and rate limiting
2. **RabbitMQ** enables event-driven architecture and decouples services
3. **Celery** handles background tasks and scheduled jobs asynchronously
4. **Flower** provides visibility into Celery operations

### When to Use What

**Use Redis for:**
- Caching frequently accessed data
- Distributed locking in concurrent scenarios
- Rate limiting API endpoints
- Session storage
- Real-time analytics

**Use RabbitMQ for:**
- Event-driven communication between services
- Decoupling producers and consumers
- Reliable message delivery
- Complex routing patterns
- Task queue broker

**Use Celery for:**
- Long-running background tasks
- Scheduled/periodic tasks
- Email sending
- Report generation
- Data processing pipelines
- Cleanup jobs

**Use Flower for:**
- Monitoring Celery workers
- Debugging task failures
- Viewing task history
- Managing workers
- Performance analysis

---

## Additional Resources

### Documentation
- **Redis**: https://redis.io/documentation
- **RabbitMQ**: https://www.rabbitmq.com/documentation.html
- **Celery**: https://docs.celeryq.dev/
- **Flower**: https://flower.readthedocs.io/

### SeatFlow Implementation Files
- Redis: `seatflow/services/redis/`, `seatflow/core/cache.py`, `seatflow/core/lock.py`
- RabbitMQ: `seatflow/services/rabbit/`, `seatflow/events/`
- Celery: `seatflow/tasks/`
- Configuration: `seatflow/config.py`

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f redis
docker-compose logs -f rabbitmq
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart redis
```

---

**End of Guide**

This comprehensive guide covers the theory, implementation, and practical usage of Redis, RabbitMQ, Celery, and Flower in the SeatFlow application. Use this as a reference for understanding how these components work together to create a scalable, high-performance flash-sale ticket booking platform.
