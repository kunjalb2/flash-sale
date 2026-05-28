from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from seatflow.log import configure_logging
from seatflow.config import settings
from seatflow.web.api.router import api_router
from seatflow.web.lifespan import lifespan_setup
from seatflow.core.middleware.logging_middleware import LoggingMiddleware
from seatflow.core.middleware.exception_handler import setup_exception_handlers


def get_app() -> FastAPI:
    """Get FastAPI application."""
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        description="Premium flash-sale ticket booking platform",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan_setup,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)
    setup_exception_handlers(app)

    app.include_router(router=api_router, prefix="/api")

    @app.get("/api/v1/health")
    async def health_check() -> dict:
        return {
            "status": "healthy",
            "service": settings.app_name,
            "environment": settings.environment,
        }

    return app
