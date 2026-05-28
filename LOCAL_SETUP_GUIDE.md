# Running SeatFlow Locally Without Docker

This guide provides step-by-step instructions for running the SeatFlow flash-sale booking platform on your local machine without using Docker.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites](#prerequisites)
3. [Service Installation](#service-installation)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Operating System
- macOS 10.15+, Linux (Ubuntu 20.04+, Debian 11+, etc.), or Windows 10/11 with WSL2

### Hardware
- **CPU**: 2+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 5GB free space

---

## Prerequisites

### Required Software Versions

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.12.x | Backend runtime |
| PostgreSQL | 16.x | Primary database |
| Redis | 7.x | Cache & distributed locks |
| RabbitMQ | 4.0.x | Message queue |
| Node.js | 20.x or 22.x | Frontend runtime |
| npm | 10.x+ | Package manager |
| Git | Latest | Version control |

### Checking Your Versions

```bash
# Check Python
python --version  # or python3 --version

# Check PostgreSQL
psql --version

# Check Redis
redis-server --version

# Check RabbitMQ
rabbitmqctl version

# Check Node.js
node --version

# Check npm
npm --version
```

---

## Service Installation

### 1. PostgreSQL Installation

#### macOS (Homebrew)
```bash
# Install PostgreSQL 16
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Verify installation
psql --version
```

#### Ubuntu/Debian
```bash
# Add PostgreSQL repository and install
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

#### Create Database and Users

```bash
# Connect to PostgreSQL
psql postgres

# Run these SQL commands (copy-paste):
CREATE USER seatflow_user WITH PASSWORD 'seatflow_password';

CREATE DATABASE seatflow OWNER seatflow_user;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE seatflow TO seatflow_user;

\c seatflow

GRANT ALL ON SCHEMA public TO seatflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seatflow_user;

-- Exit
\q
```

---

### 2. Redis Installation

#### macOS (Homebrew)
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping  # Should return "PONG"
```

#### Ubuntu/Debian
```bash
# Install Redis
sudo apt update
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Verify installation
redis-cli ping
```

#### Windows
Download and install from: https://redis.io/docs/install/install-redis/

---

### 3. RabbitMQ Installation

#### macOS (Homebrew)
```bash
# Install RabbitMQ (includes management UI)
brew install rabbitmq

# Add to PATH (add to your ~/.zshrc or ~/.bash_profile)
export PATH=$PATH:/opt/homebrew/sbin  # Apple Silicon
# or
export PATH=$PATH:/usr/local/sbin     # Intel

# Start RabbitMQ service
brew services start rabbitmq

# Enable management plugin
rabbitmq-plugins enable rabbitmq_management

# Verify installation
rabbitmqctl status
```

Access management UI at: http://localhost:15672 (guest/guest)

#### Ubuntu/Debian
```bash
# Add RabbitMQ repository
sudo apt install -y erlang-nox
sudo apt install -y rabbitmq-server

# Start RabbitMQ service
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# Add user (if using different credentials)
sudo rabbitmqctl add_user guest guest
sudo rabbitmqctl set_user_tags guest administrator
sudo rabbitmqctl set_permissions -p / guest ".*" ".*" ".*"

# Verify installation
sudo rabbitmqctl status
```

Access management UI at: http://localhost:15672 (guest/guest)

#### Windows
Download and install from: https://www.rabbitmq.com/download.html

---

## Backend Setup

### 1. Install Python 3.12

#### macOS (Homebrew)
```bash
brew install python@3.12
python3.12 --version
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip
python3.12 --version
```

#### Windows
Download from: https://www.python.org/downloads/

### 2. Navigate to Backend Directory

```bash
cd backend
```

### 3. Create Virtual Environment

```bash
# Create virtual environment
python3.12 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows (Command Prompt):
.venv\Scripts\activate

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Verify activation (should show (.venv) in prompt)
```

### 4. Install Python Dependencies

```bash
# Install main dependencies
pip install -r requirements.txt

# Install development dependencies (optional, for testing)
pip install -r requirements-dev.txt

# Verify installation
pip list
```

### 5. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Copy the example or create new
cp .env.local .env
```

Edit `.env` with the following values for local development:

```env
# Application
SEATFLOW_APP_NAME=seatflow
SEATFLOW_ENVIRONMENT=development
SEATFLOW_DEBUG=true
SEATFLOW_LOG_LEVEL=INFO

# API
SEATFLOW_API_PREFIX=/v1
SEATFLOW_HOST=0.0.0.0
SEATFLOW_PORT=8000
SEATFLOW_CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
SEATFLOW_DB_HOST=localhost
SEATFLOW_DB_PORT=5432
SEATFLOW_DB_NAME=seatflow
SEATFLOW_DB_USER=seatflow_user
SEATFLOW_DB_PASS=seatflow_password
SEATFLOW_DB_POOL_SIZE=20
SEATFLOW_DB_MAX_OVERFLOW=10

# Redis
SEATFLOW_REDIS_HOST=localhost
SEATFLOW_REDIS_PORT=6379
SEATFLOW_REDIS_BASE=0
SEATFLOW_REDIS_PASS=
SEATFLOW_REDIS_MAX_CONNECTIONS=50

# RabbitMQ
SEATFLOW_RABBIT_HOST=localhost
SEATFLOW_RABBIT_PORT=5672
SEATFLOW_RABBIT_USER=guest
SEATFLOW_RABBIT_PASS=guest
SEATFLOW_RABBIT_VHOST=/

# Celery
SEATFLOW_CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
SEATFLOW_CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Stripe - Get keys from https://dashboard.stripe.com/test/apikeys
SEATFLOW_STRIPE_SECRET_KEY=sk_test_your_key_here
SEATFLOW_STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
SEATFLOW_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
SEATFLOW_PAYMENT_MODE=sandbox

# Security - CHANGE IN PRODUCTION
SEATFLOW_SECRET_KEY=dev-secret-key-change-in-production-environment-variable
SEATFLOW_ALGORITHM=HS256
SEATFLOW_ACCESS_TOKEN_EXPIRE_MINUTES=30
SEATFLOW_REFRESH_TOKEN_EXPIRE_DAYS=7

# Flash Sale Configuration
SEATFLOW_RESERVATION_TIMEOUT_SECONDS=300
SEATFLOW_MAX_TICKETS_PER_USER=5
SEATFLOW_ENABLE_DISTRIBUTED_LOCK=true
SEATFLOW_CACHE_ENABLED=true
SEATFLOW_CACHE_TTL_SECONDS=60

# Rate Limiting
SEATFLOW_RATE_LIMIT_ENABLED=true
SEATFLOW_RATE_LIMIT_PER_MINUTE=120
SEATFLOW_RATE_LIMIT_LOGIN_REQUESTS=5
SEATFLOW_RATE_LIMIT_LOGIN_WINDOW=60
SEATFLOW_RATE_LIMIT_RESERVATION_REQUESTS=10
SEATFLOW_RATE_LIMIT_RESERVATION_WINDOW=60
```

### 6. Run Database Migrations

```bash
# Make sure virtual environment is active
# Apply all migrations
alembic upgrade head

# Verify migrations
alembic current

# To create new migrations (if needed)
alembic revision --autogenerate -m "description"

# To rollback
alembic downgrade -1
```

### 7. Optional: Configure Alembic for Local PostgreSQL

If `alembic upgrade head` fails, update `alembic.ini`:

```ini
# Update the sqlalchemy.url line to match your setup
sqlalchemy.url = postgresql+asyncpg://seatflow_user:seatflow_password@localhost:5432/seatflow
```

---

## Frontend Setup

### 1. Install Node.js 20+ and npm

#### macOS (Homebrew)
```bash
brew install node
node --version
npm --version
```

#### Ubuntu/Debian
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node --version
npm --version
```

#### Windows
Download from: https://nodejs.org/

### 2. Navigate to Frontend Directory

```bash
cd ../frontend
```

### 3. Install Node.js Dependencies

```bash
# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### 4. Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# Copy example
cp .env.local.example .env.local
```

Edit `.env.local` with the following values:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Application Configuration
NEXT_PUBLIC_APP_NAME=SeatFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false

# Session Configuration
NEXT_PUBLIC_SESSION_CHECK_INTERVAL=300000
```

---

## Running the Application

### Complete Startup Sequence

#### Step 1: Start All Required Services (Separate Terminal Windows)

You'll need **5 terminal windows** for a complete setup.

**Terminal 1 - Backend API:**
```bash
cd /path/to/flash-sale/backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
cd /path/to/flash-sale/backend
source .venv/bin/activate
celery -A seatflow.tasks.celery_app worker --loglevel=info --concurrency=4
```

**Terminal 3 - Celery Beat (Scheduler):**
```bash
cd /path/to/flash-sale/backend
source .venv/bin/activate
celery -A seatflow.tasks.celery_app beat --loglevel=info
```

**Terminal 4 - Flower Dashboard (Optional - for monitoring):**
```bash
cd /path/to/flash-sale/backend
source .venv/bin/activate
celery -A seatflow.tasks.celery_app flower
```
Access Flower at: http://localhost:5555

**Terminal 5 - Frontend:**
```bash
cd /path/to/flash-sale/frontend
npm run dev
```
Access frontend at: http://localhost:3000

### Minimal Setup (Development Only)

If you're just testing and don't need background tasks:

1. **Start Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000
```

2. **Start Frontend** (in new terminal):
```bash
cd frontend
npm run dev
```

**Note:** Without Celery, booking confirmations and other background tasks won't work.

---

## Verification

### Check Services Are Running

```bash
# PostgreSQL
psql postgres -c "SELECT version();"

# Redis
redis-cli ping  # Should return "PONG"

# RabbitMQ
rabbitmqctl status

# Backend API
curl http://localhost:8000/api/v1/health
# Should return: {"status":"healthy",...}

# Frontend
curl http://localhost:3000
# Should return HTML
```

### Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:8000/api/v1 | - |
| API Docs (Swagger) | http://localhost:8000/api/docs | - |
| API Docs (ReDoc) | http://localhost:8000/api/redoc | - |
| Frontend | http://localhost:3000 | - |
| RabbitMQ Management | http://localhost:15672 | guest/guest |
| Flower Dashboard | http://localhost:5555 | - |

---

## Troubleshooting

### Common Issues and Solutions

#### 1. PostgreSQL Connection Refused

**Error:** `connection refused` or `could not connect to server`

**Solutions:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL
brew services start postgresql@16     # macOS
sudo systemctl start postgresql      # Linux

# Check if port 5432 is accessible
lsof -i :5432
```

#### 2. Redis Connection Issues

**Error:** `Error connecting to Redis` or `Connection refused`

**Solutions:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis              # macOS
sudo systemctl start redis           # Linux

# Check Redis config
redis-cli CONFIG GET port
```

#### 3. RabbitMQ Connection Issues

**Error:** `Error connecting to RabbitMQ` or `connection refused`

**Solutions:**
```bash
# Check if RabbitMQ is running
rabbitmqctl status

# Start RabbitMQ
brew services start rabbitmq          # macOS
sudo systemctl start rabbitmq-server  # Linux

# Check if port 5672 is accessible
lsof -i :5672

# Reset RabbitMQ (if needed)
brew services restart rabbitmq
```

#### 4. Database Migration Failures

**Error:** `Target database is not up to date` or migration errors

**Solutions:**
```bash
# Check current migration version
alembic current

# Check migration history
alembic history

# Reset migrations (CAUTION: drops data!)
alembic downgrade base
alembic upgrade head

# Manual check
psql seatflow
\d  # List tables
```

#### 5. Python Import Errors

**Error:** `ModuleNotFoundError` or import errors

**Solutions:**
```bash
# Verify virtual environment is active
which python  # Should point to .venv/bin/python

# Reinstall dependencies
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.12.x
```

#### 6. Celery Worker Not Processing Tasks

**Symptoms:** Tasks stuck in "pending" state

**Solutions:**
```bash
# Check Celery worker logs for errors
# Make sure all services are running

# Test Celery connection
celery -A seatflow.tasks.celery_app inspect active

# Restart Celery worker
# In the Celery terminal, press Ctrl+C, then:
celery -A seatflow.tasks.celery_app worker --loglevel=info --concurrency=4
```

#### 7. Frontend Build Errors

**Error:** Module not found or build failures

**Solutions:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json .next
npm install

# Check Node.js version
node --version  # Should be 20+

# Clear Next.js cache
npm run dev -- --turbopack
```

#### 8. Port Already in Use

**Error:** `Address already in use` or port conflicts

**Solutions:**
```bash
# Find process using the port
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :6379  # Redis
lsof -i :5432  # PostgreSQL
lsof -i :5672  # RabbitMQ

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
uvicorn seatflow.web.application:get_app --factory --reload --port 8001
```

#### 9. Permission Denied Errors

**Error:** `Permission denied` when accessing files or directories

**Solutions:**
```bash
# On macOS/Linux, check file permissions
ls -la

# Fix permissions for database directory (if using local installation)
sudo chown -R $USER /usr/local/var/postgres  # macOS
sudo chown -R $USER /var/lib/postgresql       # Linux
```

#### 10. Stripe Payment Issues

**Error:** Payment failures or webhook errors

**Solutions:**
```bash
# Verify Stripe keys are correct in .env
# Use test keys from Stripe Dashboard

# For webhook testing, use Stripe CLI:
stripe listen --forward-to localhost:8000/api/v1/payments/webhook

# Check Stripe Dashboard for logs:
# https://dashboard.stripe.com/test/logs
```

### Getting Help

If you encounter issues not covered above:

1. Check the application logs for detailed error messages
2. Verify all services are running and accessible
3. Ensure environment variables are correctly set
4. Review the [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
5. Check the [CLAUDE.md](./CLAUDE.md) for project-specific guidance

### System-Specific Notes

#### macOS
- If using Apple Silicon (M1/M2/M3), ensure all tools are installed for ARM architecture
- Some Homebrew services may need manual startup: `brew services list`

#### Linux
- Use `sudo` for system service management
- Check firewall settings: `sudo ufw status` (Ubuntu)
- PostgreSQL may run under the `postgres` user

#### Windows (WSL2)
- Ensure WSL2 is properly configured
- Some services may need additional setup in Windows
- Consider using Docker Desktop for easier service management

---

## Development Tips

### Code Quality

```bash
# Backend
cd backend
make lint        # Ruff linter
make format      # Ruff formatter
make test        # Run tests
make test-cov    # Run tests with coverage

# Frontend
cd frontend
npm run lint
npm run type-check
```

### Database Management

```bash
# Open PostgreSQL shell
psql seatflow

# Useful commands
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

### Monitoring

- **Flower**: http://localhost:5555 - Celery task monitoring
- **RabbitMQ Management**: http://localhost:15672 - Message queue monitoring
- **Backend Logs**: Check terminal output for uvicorn/celery
- **Frontend Logs**: Check browser console and terminal output

---

## Production Considerations

This setup is for **development only**. For production deployment:

1. Use a process manager (systemd, supervisor, PM2)
2. Use a production WSGI/ASGI server (Gunicorn, Uvicorn with workers)
3. Enable HTTPS and configure proper CORS
4. Use strong, unique SECRET_KEY and passwords
5. Configure proper database backups
6. Set up monitoring and logging
7. Use environment-specific configurations
8. Secure RabbitMQ and Redis with authentication
9. Configure proper rate limiting and security headers

---

## Quick Reference

### Start Commands

```bash
# Terminal 1 - Backend
cd backend && source .venv/bin/activate && uvicorn seatflow.web.application:get_app --factory --reload

# Terminal 2 - Celery Worker
cd backend && source .venv/bin/activate && celery -A seatflow.tasks.celery_app worker

# Terminal 3 - Celery Beat
cd backend && source .venv/bin/activate && celery -A seatflow.tasks.celery_app beat

# Terminal 4 - Frontend
cd frontend && npm run dev
```

### Stop Commands

```bash
# Stop Backend - Ctrl+C in Terminal 1
# Stop Celery Worker - Ctrl+C in Terminal 2
# Stop Celery Beat - Ctrl+C in Terminal 3
# Stop Frontend - Ctrl+C in Terminal 4

# Or stop all system services (if using service managers)
brew services stop postgresql@16 rabbitmq redis  # macOS
sudo systemctl stop postgresql rabbitmq-server redis  # Linux
```

### Environment File Locations

- Backend: `backend/.env`
- Frontend: `frontend/.env.local`

### Database Connection

```bash
psql -h localhost -U seatflow_user -d seatflow
# Password: seatflow_password
```

---

## Additional Resources

- [Backend API Documentation](http://localhost:8000/api/docs)
- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
- [Project README](./README.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Celery Documentation](https://docs.celeryq.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

---

**Last Updated:** 2026-05-23
**Project Version:** 0.1.0