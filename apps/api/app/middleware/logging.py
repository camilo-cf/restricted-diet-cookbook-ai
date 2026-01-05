import time
import uuid
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            response.headers["X-Request-Id"] = request_id
            
            process_time = time.time() - start_time
            logger.info(
                "request_completed",
                path=request.url.path,
                method=request.method,
                status=response.status_code,
                duration=process_time,
                user_agent=request.headers.get("user-agent"),
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "request_failed",
                path=request.url.path,
                method=request.method,
                duration=process_time,
                error=str(e),
                exc_info=True
            )
            raise e
