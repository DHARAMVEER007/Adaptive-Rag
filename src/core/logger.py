"""
Application logging configuration.

Provides a single configured root handler whose format includes a per-request
correlation id (``request_id``). The id is carried in a ContextVar that the
request-id middleware sets for the lifetime of each HTTP request, so every log
line emitted while handling that request is automatically correlated.
"""

import logging
import os
import sys
from contextvars import ContextVar

# Set by the request-id middleware; defaults to "-" outside a request.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

_LOG_FORMAT = "%(asctime)s %(levelname)-7s [%(name)s] [req=%(request_id)s] %(message)s"


class _RequestIdFilter(logging.Filter):
    """Inject the current request_id onto every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def configure_logging(level: str | None = None) -> None:
    """
    Configure the root logger once, at application startup.

    Args:
        level: Log level name; defaults to the LOG_LEVEL env var, else INFO.
    """
    level_name = (level or os.getenv("LOG_LEVEL", "INFO")).upper()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    handler.addFilter(_RequestIdFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, level_name, logging.INFO))


def get_logger(name: str) -> logging.Logger:
    """Return a module logger that inherits the configured root handler."""
    return logging.getLogger(name)


# Backwards-compatible module logger.
logger = get_logger("adaptive_rag")
