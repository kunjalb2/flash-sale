from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from starlette.requests import Request

_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get the global async session factory."""
    global _session_factory
    if _session_factory is None:
        raise RuntimeError("Session factory not initialized. Call init_session_factory first.")
    return _session_factory


def init_session_factory(engine) -> None:
    """Initialize the global session factory with an engine."""
    global _session_factory
    _session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Create and get database session."""
    session: AsyncSession = request.app.state.db_session_factory()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.commit()
        await session.close()
