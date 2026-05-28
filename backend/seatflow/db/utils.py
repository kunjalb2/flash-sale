from sqlalchemy.ext.asyncio import create_async_engine

from seatflow.db.meta import meta
from seatflow.db.models import load_all_models
from seatflow.config import settings


async def create_tables() -> None:
    """Populate tables in the database."""
    load_all_models()
    engine = create_async_engine(str(settings.db_url))
    async with engine.begin() as connection:
        await connection.run_sync(meta.create_all)
    await engine.dispose()
