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
