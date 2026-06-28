"""
Unit tests for src/api/security.py.

All tests run without a database or LLM — only JWT signing/verification logic.
"""

import os
import datetime

import pytest
import jwt as pyjwt
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Ensure JWT_SECRET is set before security.py is imported/reloaded.
os.environ.setdefault("JWT_SECRET", "ci-test-key")

import src.api.security as security_module  # noqa: E402
from src.api.security import CurrentUser, require_session_owner  # noqa: E402


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_token(username="testuser", role="user", expired=False):
    key = os.environ["JWT_SECRET"]
    now = datetime.datetime.now(datetime.timezone.utc)
    exp = now - datetime.timedelta(hours=1) if expired else now + datetime.timedelta(hours=1)
    payload = {"sub": username, "role": role, "iat": now, "exp": exp}
    return pyjwt.encode(payload, key, algorithm="HS256")


def _make_token_no_sub():
    key = os.environ["JWT_SECRET"]
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {"iat": now, "exp": now + datetime.timedelta(hours=1)}
    return pyjwt.encode(payload, key, algorithm="HS256")


# Minimal FastAPI app that exercises get_current_user dependency.
_app = FastAPI()


@_app.get("/protected")
def _protected(user: CurrentUser = pytest.importorskip("fastapi").Depends(security_module.get_current_user)):
    return {"username": user.username, "role": user.role}


_client = TestClient(_app, raise_server_exceptions=False)


# ── get_current_user ──────────────────────────────────────────────────────────

def test_valid_token_returns_user():
    token = _make_token("alice", "admin")
    resp = _client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"username": "alice", "role": "admin"}


def test_missing_auth_header_returns_403():
    resp = _client.get("/protected")
    assert resp.status_code in (401, 403)


def test_expired_token_returns_401():
    token = _make_token(expired=True)
    resp = _client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"]


def test_tampered_token_returns_401():
    token = _make_token() + "garbage"
    resp = _client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_token_signed_with_wrong_key_returns_401():
    payload = {
        "sub": "hacker",
        "role": "admin",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
    }
    bad_token = pyjwt.encode(payload, "wrong-key", algorithm="HS256")
    resp = _client.get("/protected", headers={"Authorization": f"Bearer {bad_token}"})
    assert resp.status_code == 401


def test_token_missing_sub_returns_401():
    token = _make_token_no_sub()
    resp = _client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert "missing subject" in resp.json()["detail"]


# ── require_session_owner ─────────────────────────────────────────────────────

def test_session_owner_match_passes():
    user = CurrentUser(username="alice", role="user")
    require_session_owner("alice_1234567890", user)  # should not raise


def test_session_owner_mismatch_raises_403():
    from fastapi import HTTPException
    user = CurrentUser(username="alice", role="user")
    with pytest.raises(HTTPException) as exc_info:
        require_session_owner("bob_1234567890", user)
    assert exc_info.value.status_code == 403


def test_session_owner_partial_prefix_raises_403():
    from fastapi import HTTPException
    user = CurrentUser(username="ali", role="user")
    with pytest.raises(HTTPException):
        require_session_owner("alice_123", user)


def test_session_owner_empty_session_id_raises_403():
    from fastapi import HTTPException
    user = CurrentUser(username="alice", role="user")
    with pytest.raises(HTTPException):
        require_session_owner("", user)
