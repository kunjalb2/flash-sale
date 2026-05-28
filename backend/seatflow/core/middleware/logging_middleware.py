import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from loguru import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid4())
        request.state.request_id = request_id

        start_time = time.time()
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)

        logger.info(
            f"{request.method} {request.url.path} | "
            f"status={response.status_code} duration_ms={duration} "
            f"request_id={request_id}"
        )

        response.headers["X-Request-ID"] = request_id
        return response
