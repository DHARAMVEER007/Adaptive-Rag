"""
Integration tests for mock_auth/main.py.

MongoDB is fully mocked via unittest.mock so no real database is needed.
"""

import os
import sys
import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "ci-test-key")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB_NAME", "adaptive_rag_test")

# mock_auth lives at the repo root, not inside src/, so add it to path.
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parents[1] / "mock_auth"))

# Patch Motor client before importing the app so it never dials MongoDB.
_mock_collection = MagicMock()
_mock_collection.find_one = AsyncMock(return_value=None)
_mock_collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id="fake-id"))

with patch("motor.motor_asyncio.AsyncIOMotorClient", return_value=MagicMock(
    __getitem__=MagicMock(return_value=MagicMock(
        __getitem__=MagicMock(return_value=_mock_collection)
    ))
)):
    import main as auth_main  # noqa: E402  (mock_auth/main.py)

client = TestClient(auth_main.app, raise_server_exceptions=False)


# ── /api/create_user ──────────────────────────────────────────────────────────

def test_create_user_success(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None

    resp = client.post("/api/create_user", json={"username": "alice", "password": "Pass1234"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "user"


def test_create_user_duplicate(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = {"username": "alice"}

    resp = client.post("/api/create_user", json={"username": "alice", "password": "Pass1234"})
    assert resp.status_code == 409


def test_create_user_weak_password(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None

    resp = client.post("/api/create_user", json={"username": "alice", "password": "short"})
    assert resp.status_code == 422


def test_create_user_no_digit(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None

    resp = client.post("/api/create_user", json={"username": "alice", "password": "NoDigitHere"})
    assert resp.status_code == 422


def test_create_user_invalid_username(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None

    resp = client.post("/api/create_user", json={"username": "a!", "password": "Pass1234"})
    assert resp.status_code == 422


# ── /api/login ────────────────────────────────────────────────────────────────

def test_login_success(monkeypatch):
    import bcrypt
    hashed = bcrypt.hashpw(b"Pass1234", bcrypt.gensalt())
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = {
        "username": "alice",
        "password": hashed,
        "role": "user",
    }
    # Clear any leftover rate-limit state.
    auth_main._failed_attempts.clear()

    resp = client.post("/api/login", json={"username": "alice", "password": "Pass1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert "jwt" in data
    assert data["role"] == "user"


def test_login_wrong_password(monkeypatch):
    import bcrypt
    hashed = bcrypt.hashpw(b"Pass1234", bcrypt.gensalt())
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = {
        "username": "alice",
        "password": hashed,
        "role": "user",
    }
    auth_main._failed_attempts.clear()

    resp = client.post("/api/login", json={"username": "alice", "password": "WrongPass9"})
    assert resp.status_code == 401


def test_login_unknown_user(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None
    auth_main._failed_attempts.clear()

    resp = client.post("/api/login", json={"username": "ghost", "password": "Pass1234"})
    assert resp.status_code == 401


def test_login_rate_limit(monkeypatch):
    import time
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None
    auth_main._failed_attempts.clear()

    # Simulate MAX_FAILED_ATTEMPTS failures within the lockout window.
    auth_main._failed_attempts["ratelimited"] = {
        "count": auth_main.MAX_FAILED_ATTEMPTS,
        "first_attempt": time.time(),
    }
    resp = client.post("/api/login", json={"username": "ratelimited", "password": "Pass1234"})
    assert resp.status_code == 429


# ── /api/create_admin ─────────────────────────────────────────────────────────

def test_create_admin_success(monkeypatch):
    monkeypatch.setattr(auth_main, "users_collection", _mock_collection)
    _mock_collection.find_one.return_value = None

    resp = client.post("/api/create_admin", json={"username": "admin1", "password": "Admin1234"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"
