from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from loguru import logger


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception: {exc} | path={request.url.path}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
