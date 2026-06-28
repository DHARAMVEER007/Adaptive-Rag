"""
Shared fixtures for all test modules.

Set JWT_SECRET env-var to a known test value before importing app modules.
In CI, JWT_SECRET is injected via workflow env so this fallback is unused.
"""

import datetime
import os

import pytest
import jwt as pyjwt


# Read from env so CI can override; the fallback is a non-production test key.
_SIGNING_KEY = os.environ.get("JWT_SECRET") or os.environ.setdefault(
    "JWT_SECRET", "ci-test-key"
) or "ci-test-key"


@pytest.fixture
def signing_key() -> str:
    return os.environ["JWT_SECRET"]


@pytest.fixture
def make_token(signing_key):
    """Factory that returns a signed JWT string."""
    def _make(username: str = "testuser", role: str = "user", expired: bool = False) -> str:
        now = datetime.datetime.now(datetime.timezone.utc)
        exp = (
            now - datetime.timedelta(hours=1)
            if expired
            else now + datetime.timedelta(hours=1)
        )
        payload = {"sub": username, "role": role, "iat": now, "exp": exp}
        return pyjwt.encode(payload, signing_key, algorithm="HS256")

    return _make
