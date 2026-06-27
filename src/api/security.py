"""
JWT verification for protected API routes.

Decodes the HS256 token issued by the auth service. The signing config
(secret + algorithm) MUST match mock_auth/main.py.
"""

import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALG = "HS256"

_bearer = HTTPBearer(auto_error=True)


class CurrentUser:
    """The authenticated principal extracted from a verified JWT."""

    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    """
    Decode and verify the bearer token. Raises 401 on any failure.

    Returns:
        CurrentUser: the verified username and role.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="invalid token: missing subject")

    return CurrentUser(username=username, role=payload.get("role", "user"))


def require_session_owner(session_id: str, user: CurrentUser) -> None:
    """
    Enforce that a session_id belongs to the authenticated user.

    Sessions are keyed `<username>_<timestamp>`, so ownership is the
    username prefix. Raises 403 on mismatch.
    """
    if not session_id.startswith(f"{user.username}_"):
        raise HTTPException(status_code=403, detail="session does not belong to you")
