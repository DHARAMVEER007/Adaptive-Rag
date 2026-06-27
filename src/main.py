"""
Main FastAPI application entry point.
"""

import os
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.logger import configure_logging, get_logger, request_id_ctx

configure_logging()
logger = get_logger("adaptive_rag.api")

# Import routes after logging is configured so module-level loggers inherit it.
from src.api.routes import router  # noqa: E402

app = FastAPI(title="Adaptive RAG API")

# Comma-separated allowlist; defaults to the local dev frontend origin.
_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestIdMiddleware:
    """
    Pure-ASGI middleware that binds an X-Request-Id to the logging context for
    the whole request lifetime and echoes it on the response.

    Implemented at the ASGI layer (not BaseHTTPMiddleware) so the ContextVar set
    here survives into the global exception handler — BaseHTTPMiddleware runs the
    app in a child context and would reset the id before a 500 is handled.
    """

    def __init__(self, app_):
        self.app = app_

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        rid = headers.get(b"x-request-id", b"").decode() or uuid.uuid4().hex[:12]
        request_id_ctx.set(rid)

        async def send_with_id(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                message["headers"].append((b"x-request-id", rid.encode()))
            await send(message)

        await self.app(scope, receive, send_with_id)


app.add_middleware(RequestIdMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the full traceback server-side; return a generic 500 to the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id_ctx.get()},
    )


app.include_router(router)
app.state.description_ = ""


@app.get("/")
async def root():
    """Root endpoint to verify API is running."""
    return {"message": "Adaptive RAG API is running"}
