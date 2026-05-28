from datetime import datetime, timedelta

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger
from seatflow.tasks.celery_app import celery_app

celery_app.conf.update(
    beat_schedule={
        "cleanup-expired-chat-sessions": {
            "task": "seatflow.tasks.chat_tasks.cleanup_expired_chat_sessions",
            "schedule": 3600.0,
        },
    }
)


@celery_app.task(name="seatflow.tasks.chat_tasks.cleanup_expired_chat_sessions")
def cleanup_expired_chat_sessions() -> dict[str, int]:
    ServiceLogger.log(
        service="BackgroundTask",
        operation="cleanup_expired_sessions",
        action="start",
    )

    import asyncio
    import nest_asyncio
    nest_asyncio.apply()

    async def _cleanup() -> int:
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from seatflow.db.dao.chat_session import ChatSessionDAO

        engine = create_async_engine(
            str(settings.db_url),
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        try:
            async with session_maker() as session:
                repo = ChatSessionDAO(session)
                threshold = datetime.utcnow() - timedelta(hours=1)
                count = await repo.expire_old_sessions(threshold)
                await session.commit()
                return count
        finally:
            await engine.dispose()

    try:
        count = asyncio.run(_cleanup())
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_sessions",
            action="completed",
            expired_count=count,
        )
        return {"expired_count": count, "status": "completed"}
    except Exception as e:
        ServiceLogger.log(
            service="BackgroundTask",
            operation="cleanup_expired_sessions",
            action="error",
            error=str(e),
            level="error",
        )
        raise