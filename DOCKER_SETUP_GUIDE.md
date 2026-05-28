# Docker Setup Guide for SeatFlow

This guide provides step-by-step instructions for running the SeatFlow flash-sale booking platform using Docker and Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Docker Services Overview](#docker-services-overview)
4. [Configuration](#configuration)
5. [Development Workflow](#development-workflow)
6. [Database Operations](#database-operations)
7. [Troubleshooting](#troubleshooting)
8. [Production Considerations](#production-considerations)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Git | Latest | Version control |

### Checking Your Setup

```bash
# Check Docker installation
docker --version
docker-compose version

# Verify Docker is running
docker ps
```

### Installing Docker

#### macOS
```bash
# Download Docker Desktop for Mac
# https://www.docker.com/products/docker-desktop

# Or install via Homebrew
brew install --cask docker
```

#### Ubuntu/Debian
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

#### Windows
```bash
# Download Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop

# Enable WSL 2 backend in Docker Desktop settings
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd flash-sale
```

### 2. Configure Environment Variables

**Backend:**
```bash
cd backend
cp .env.local .env
# Edit .env with your settings
```

**Frontend:**
```bash
cd ../frontend
cp .env.local.example .env.local
# Edit .env.local with your settings
```

### 3. Start All Services

```bash
# From project root
cd backend

# Start all services
make docker-up
# or
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Run Database Migrations

```bash
# From backend directory
docker-compose exec backend alembic upgrade head

# Verify migrations
docker-compose exec backend alembic current
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Frontend | http://localhost:3000 |
| RabbitMQ Management | http://localhost:15672 |
| Flower Dashboard | http://localhost:5555 |

### 6. Stop All Services

```bash
# Stop all services
make docker-down
# or
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

---

## Docker Services Overview

### Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                       │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Backend  │  │  Worker  │  │   Beat   │  │  Flower  │   │
│  │  :8000   │  │          │  │          │  │  :5555   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│                      │                                       │
│       ┌──────────────┼──────────────┐                       │
│       │              │              │                       │
│  ┌────▼────┐   ┌────▼────┐   ┌────▼────┐                  │
│  │Postgres │   │  Redis  │   │RabbitMQ │                  │
│  │ :5432   │   │  :6379  │   │ :5672   │                  │
│  └─────────┘   └─────────┘   └─────────┘                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Container Name | Ports | Description |
|---------|---------------|-------|-------------|
| PostgreSQL | `postgres` | 5432 | Primary database |
| Redis | `redis` | 6379 | Cache & distributed locks |
| RabbitMQ | `rabbitmq` | 5672, 15672 | Message queue & management UI |
| Backend API | `backend` | 8000 | FastAPI application |
| Celery Worker | `celery_worker` | - | Background task processor |
| Celery Beat | `celery_beat` | - | Scheduled tasks |
| Flower | `flower` | 5555 | Celery task monitoring |

---

## Configuration

### Docker Compose Configuration

**File**: `backend/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: seatflow_postgres
    environment:
      POSTGRES_DB: seatflow
      POSTGRES_USER: seatflow_user
      POSTGRES_PASSWORD: seatflow_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U seatflow_user -d seatflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: seatflow_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: seatflow_rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: seatflow_backend
    ports:
      - "8000:8000"
    environment:
      - SEATFLOW_DB_HOST=postgres
      - SEATFLOW_DB_PORT=5432
      - SEATFLOW_DB_NAME=seatflow
      - SEATFLOW_DB_USER=seatflow_user
      - SEATFLOW_DB_PASS=seatflow_password
      - SEATFLOW_REDIS_HOST=redis
      - SEATFLOW_REDIS_PORT=6379
      - SEATFLOW_RABBIT_HOST=rabbitmq
      - SEATFLOW_RABBIT_PORT=5672
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./seatflow:/app/seatflow
      - ./logs:/app/logs
    command: uvicorn seatflow.web.application:get_app --factory --host 0.0.0.0 --port 8000 --reload

  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: seatflow_celery_worker
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      - SEATFLOW_DB_HOST=postgres
      - SEATFLOW_DB_PORT=5432
      - SEATFLOW_DB_NAME=seatflow
      - SEATFLOW_DB_USER=seatflow_user
      - SEATFLOW_DB_PASS=seatflow_password
      - SEATFLOW_REDIS_HOST=redis
      - SEATFLOW_REDIS_PORT=6379
      - SEATFLOW_RABBIT_HOST=rabbitmq
      - SEATFLOW_RABBIT_PORT=5672
    volumes:
      - ./seatflow:/app/seatflow
      - ./logs:/app/logs
    command: celery -A seatflow.tasks.celery_app worker --loglevel=info --concurrency=4

  celery_beat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: seatflow_celery_beat
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      - SEATFLOW_DB_HOST=postgres
      - SEATFLOW_DB_PORT=5432
      - SEATFLOW_DB_NAME=seatflow
      - SEATFLOW_DB_USER=seatflow_user
      - SEATFLOW_DB_PASS=seatflow_password
      - SEATFLOW_REDIS_HOST=redis
      - SEATFLOW_REDIS_PORT=6379
      - SEATFLOW_RABBIT_HOST=rabbitmq
      - SEATFLOW_RABBIT_PORT=5672
    volumes:
      - ./seatflow:/app/seatflow
      - ./logs:/app/logs
    command: celery -A seatflow.tasks.celery_app beat --loglevel=info

  flower:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: seatflow_flower
    ports:
      - "5555:5555"
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      - SEATFLOW_RABBIT_HOST=rabbitmq
      - SEATFLOW_RABBIT_PORT=5672
    command: celery -A seatflow.tasks.celery_app flower

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

### Dockerfile

**File**: `backend/Dockerfile`

```dockerfile
# Base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Default command
CMD ["uvicorn", "seatflow.web.application:get_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Development Workflow

### Running Commands in Containers

```bash
# Execute command in backend container
docker-compose exec backend <command>

# Execute command in postgres container
docker-compose exec postgres psql -U seatflow_user -d seatflow

# Execute command in redis container
docker-compose exec redis redis-cli

# Execute command in celery worker container
docker-compose exec celery_worker <command>
```

### Common Development Tasks

**Run tests:**
```bash
docker-compose exec backend pytest tests/ -v
```

**Run specific test:**
```bash
docker-compose exec backend pytest tests/test_auth.py::test_login -v
```

**Create database migration:**
```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
```

**Apply database migration:**
```bash
docker-compose exec backend alembic upgrade head
```

**Rollback migration:**
```bash
docker-compose exec backend alembic downgrade -1
```

**Code formatting:**
```bash
docker-compose exec backend ruff format .
```

**Linting:**
```bash
docker-compose exec backend ruff check .
```

**View backend logs:**
```bash
docker-compose logs -f backend
```

**View all logs:**
```bash
docker-compose logs -f
```

### Hot Reload

The backend container uses the `--reload` flag, so code changes are automatically reflected:

1. Make changes to your code
2. The container will automatically restart
3. Changes are immediately available

### Restarting Services

```bash
# Restart specific service
docker-compose restart backend

# Restart all services
docker-compose restart

# Rebuild and restart (after Dockerfile changes)
docker-compose up -d --build
```

---

## Database Operations

### Access PostgreSQL

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U seatflow_user -d seatflow

# Useful psql commands
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U seatflow_user seatflow > backup.sql

# Restore backup
cat backup.sql | docker-compose exec -T postgres psql -U seatflow_user seatflow
```

### Reset Database

```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Access Redis

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Useful Redis commands
ping             # Test connection
keys *           # List all keys
get <key>        # Get value
del <key>        # Delete key
flushall         # Delete all keys
```

### Access RabbitMQ Management UI

```
URL: http://localhost:15672
Username: guest
Password: guest
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker-compose logs backend

# Check container status
docker-compose ps

# Check if ports are in use
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :5672  # RabbitMQ
```

### Database Connection Issues

```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql+asyncpg://seatflow_user:seatflow_password@postgres:5432/seatflow'); print('Connected')"
```

### Redis Connection Issues

```bash
# Check if Redis is healthy
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

### RabbitMQ Connection Issues

```bash
# Check if RabbitMQ is healthy
docker-compose ps rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq

# Test connection
docker-compose exec rabbitmq rabbitmqctl status
```

### Volume Issues

```bash
# List volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Remove specific volume
docker volume rm backend_postgres_data
```

### Permission Issues

```bash
# Fix permissions for mounted volumes (Linux/Mac)
sudo chown -R $USER:$USER .

# Or run Docker without sudo (add user to docker group)
sudo usermod -aG docker $USER
```

### Container Not Reflecting Code Changes

```bash
# Restart the container
docker-compose restart backend

# Rebuild the image
docker-compose up -d --build backend

# Check volume mounts
docker-compose config
```

### Out of Memory Issues

```bash
# Check container resource usage
docker stats

# Increase memory limit in docker-compose.yml
services:
  backend:
    mem_limit: 2g
    memswap_limit: 2g
```

---

## Production Considerations

### Security

1. **Remove debug tools** in production:
   - Remove Flower
   - Disable debug mode
   - Remove health check endpoints

2. **Use secrets** for sensitive data:
   ```yaml
   services:
     backend:
       secrets:
         - db_password
         - stripe_secret_key

   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Use environment files**:
   ```yaml
   services:
     backend:
       env_file:
         - .env.production
   ```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Health Checks

All services should have health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Auto-restart Policies

```yaml
services:
  backend:
    restart: unless-stopped
```

### Logging

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Monitoring

Consider adding monitoring services:
- Prometheus for metrics
- Grafana for dashboards
- ELK stack for log aggregation

---

## Quick Reference

### Docker Compose Commands

```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes
docker-compose ps                 # List services
docker-compose logs -f            # Follow logs
docker-compose logs backend       # Service-specific logs
docker-compose restart backend    # Restart service
docker-compose exec backend bash  # Execute command in container
docker-compose up -d --build      # Rebuild and start
```

### Common Operations

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Run tests
docker-compose exec backend pytest tests/ -v

# Access database
docker-compose exec postgres psql -U seatflow_user -d seatflow

# Access Redis
docker-compose exec redis redis-cli

# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Rebuild service
docker-compose up -d --build backend
```

### Service URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs |
| Frontend | http://localhost:3000 |
| RabbitMQ Management | http://localhost:15672 |
| Flower Dashboard | http://localhost:5555 |

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [PostgreSQL Docker Images](https://hub.docker.com/_/postgres)
- [Redis Docker Images](https://hub.docker.com/_/redis)
- [RabbitMQ Docker Images](https://hub.docker.com/_/rabbitmq)

---

**Last Updated:** 2026-05-23
**Project Version:** 0.1.0