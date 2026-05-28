# Python Debugging Guide

For PHP developers transitioning from xdebug to Python debugging in the SeatFlow FastAPI project.

## 1. VS Code Debugger (Recommended)

**Setup:**
- Install [Python Extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) in VS Code

**Launch Configuration** (create `.vscode/launch.json` in project root):

```json
{
    "version": "0.1.0",
    "configurations": [
        {
            "name": "FastAPI: Backend",
            "type": "debugpy",
            "request": "launch",
            "module": "uvicorn",
            "args": [
                "seatflow.web.application:get_app",
                "--factory",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--reload"
            ],
            "cwd": "${workspaceFolder}/backend",
            "envFile": "${workspaceFolder}/backend/.env",
            "console": "integratedTerminal"
        }
    ]
}
```

**Keyboard Shortcuts:**
- `F5` - Start debugging
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into
- `Shift+F11` - Step out
- `F5` - Continue

**Usage:**
1. Open VS Code
2. Click bug icon in sidebar (Run and Debug)
3. Select "FastAPI: Backend"
4. Set breakpoints by clicking line numbers
5. Make API calls - execution stops at breakpoints

## 2. Programmatic Breakpoints

Add breakpoints directly in code for quick debugging:

```python
def book_ticket(user_id: int, event_id: int):
    breakpoint()  # Execution stops here with interactive REPL
    # ... rest of your code
```

**Available Commands in Debugger (PDB):**
- `c` / `continue` - Resume execution
- `n` / `next` - Step over (F10)
- `s` / `step` - Step into (F11)
- `r` / `return` - Step out of function
- `l` / `list` - Show current code context
- `p <var>` - Print variable value
- `pp <var>` - Pretty print variable
- `w` / `where` - Show stack trace
- `q` / `quit` - Quit debugger

**Example:**
```python
# In seatflow/services/booking/booking.py
async def book_ticket(user_id: int, event_id: int, seat_ids: list[int]):
    breakpoint()  # Stop here to inspect
    # ... your booking logic
```

## 3. Logging with ServiceLogger

Project uses `ServiceLogger` from `seatflow/core/logging/service_logger.py` for structured logging.

**Basic Usage:**
```python
from seatflow.core.logging.service_logger import ServiceLogger

# In any service file
def book_ticket(user_id: int, event_id: int):
    ServiceLogger.log(
        service="BookingService",
        operation="book_ticket",
        user_id=str(user_id),
        entity_id=str(event_id),
        success=True,
        ticket_count=len(seat_ids)
    )

# Business logic logging
ServiceLogger.log_business_logic(
    service="PricingService",
    operation="calculate_pricing",
    user_id=user_id,
    base_price=100,
    discount=0.1
)

# Performance logging
ServiceLogger.log_performance(
    service="Database",
    operation="query",
    duration_ms=45.2,
    table="events"
)
```

## 4. FastAPI Auto-Reload Development Mode

Uvicorn's `--reload` flag automatically restarts the server on file changes:

```bash
cd backend
uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000
```

**Benefits:**
- No manual restart needed
- Changes reflect immediately
- Shows import errors in console

## 5. Interactive Debugging with ipdb

Enhanced version of pdb with tab completion and syntax highlighting:

```bash
# Install ipdb
pip install ipdb
```

**Usage:**
```python
import ipdb; ipdb.set_trace()
```

**IPDB Features:**
- Tab completion
- Syntax highlighting
- Better variable inspection
- Familiar CLI interface

## 6. Development Mode Stack Traces

FastAPI shows detailed error traces in development mode.

**Set environment variables in `.env`:**
```bash
SEATFLOW_ENVIRONMENT=development
SEATFLOW_DEBUG=true
```

**Error Response includes:**
- Full stack trace
- Request details
- Error context

## 7. Database Query Debugging

To see SQLAlchemy queries being executed:

**Temporary SQL Echo:**
```python
# In seatflow/config.py
db_echo: bool = True
```

**Query Inspection:**
```python
from sqlalchemy.dialects import postgresql

query = session.execute(select(User).filter_by(id=1))
print(query.statement.compile(dialect=postgresql.dialect()))
```

## 8. Test Debugging with Pytest

**Run specific test with debugger:**
```bash
cd backend
pytest tests/test_booking.py -v --pdb  # Drop into pdb on failure
pytest tests/test_booking.py -v --trace  # Drop into pdb at start
pytest tests/test_booking.py -v -s  # Show print statements
```

**Debug a specific test:**
```bash
pytest tests/test_booking.py::test_book_ticket -v --pdb
```

**Test markers:**
```bash
# Run only integration tests
pytest -m integration

# Run only unit tests
pytest -m unit

# Skip slow tests
pytest -m "not slow"
```

## 9. Request/Response Debugging

**FastAPI Request Inspector:**
```python
@router.post("/reservations")
async def create_reservation(request: Request, reservation: ReservationCreate):
    ServiceLogger.log(
        service="BookingAPI",
        operation="create_reservation",
        success=True,
        headers=dict(request.headers),
        body=await request.json()
    )

    # ... your logic
```

**Use curl to inspect raw responses:**
```bash
curl -v http://localhost:8000/api/v1/health
curl -X POST http://localhost:8000/api/v1/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"event_id": "uuid", "ticket_count": 2}'
```

## 10. Memory and Performance Debugging

**Check memory usage:**
```python
import sys

def some_function():
    large_data = [...]  # Your data
    ServiceLogger.log_performance(
        service="Memory",
        operation="check_size",
        duration_ms=0,
        size_bytes=sys.getsizeof(large_data)
    )
```

**Profile function performance:**
```python
import time

def some_function():
    start = time.perf_counter()
    # ... your code
    elapsed = time.perf_counter() - start
    ServiceLogger.log_performance(
        service="Function",
        operation="some_function",
        duration_ms=elapsed * 1000
    )
```

## Common Debugging Workflows

### Workflow 1: Debugging API Endpoint
1. Set breakpoint in `seatflow/services/booking/booking.py`
2. Start VS Code debugger
3. Make API call with Postman/curl
4. Inspect variables in debugger

### Workflow 2: Debugging Database Query
1. Enable `db_echo: bool = True` in config
2. Check logs for SQL queries
3. Use breakpoint before query execution
4. Inspect query parameters

### Workflow 3: Debugging Celery Task
1. Add `breakpoint()` in task function
2. Run Celery worker: `celery -A seatflow.tasks.celery_app worker --loglevel=info`
3. Trigger task from API
4. Worker will stop at breakpoint

### Workflow 4: Debugging Async Code
```python
async def async_function():
    breakpoint()  # Works in async too
    await some_async_operation()
    breakpoint()  # Multiple breakpoints
```

## Tools to Install

```bash
# Optional but useful debugging tools
pip install ipdb  # Enhanced pdb
pip install rich  # Pretty console output
pip install pdbpp  # Python Debugger++ with better UI
```

## Tips for PHP Developers

| xdebug Feature | Python Equivalent |
|---------------|-------------------|
| Breakpoints in IDE | VS Code debugger (F9) |
| Step over/into/out | F10/F11/Shift+F11 |
| Variable inspection | `p var` in pdb or hover in VS Code |
| Call stack | `w` or `where` in pdb |
| Watch expressions | VS Code watch panel |
| Profiling | `cProfile` or `py-spy` |
| Remote debugging | VS Code remote debugging or `debugpy` |

## Debugging Checklist

- [ ] VS Code Python extension installed
- [ ] Launch configuration created
- [ ] Breakpoints set in code
- [ ] Development mode enabled (`SEATFLOW_ENVIRONMENT=development`)
- [ ] ServiceLogger logging configured
- [ ] Database echo enabled (if needed)
- [ ] Celery worker running for background tasks
- [ ] All services (Postgres, Redis, RabbitMQ) running

## Troubleshooting

**Breakpoint not hitting:**
- Ensure code path is executed
- Check if running in production mode
- Verify no caching issues

**Import errors:**
- Check Python interpreter in VS Code
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

**No logs appearing:**
- Check ServiceLogger configuration
- Ensure log level is set correctly
- Check file permissions for `logs/` directory

**Database connection issues:**
- Verify Docker services running: `docker-compose ps`
- Check connection string in `.env`
- Test connection manually

## Additional Resources

- [VS Code Python Debugging](https://code.visualstudio.com/docs/python/debugging)
- [pdb Documentation](https://docs.python.org/3/library/pdb.html)
- [FastAPI Debugging](https://fastapi.tiangolo.com/tutorial/debugging/)
- [Loguru Documentation](https://loguru.readthedocs.io/)