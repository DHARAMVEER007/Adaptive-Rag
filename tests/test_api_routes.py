"""
Integration tests for src/api/routes.py.

LangGraph builder and MongoDB are both mocked — no external services needed.
"""

import os
import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import jwt as pyjwt
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

os.environ.setdefault("JWT_SECRET", "ci-test-key")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB_NAME", "adaptive_rag_test")

# ── Patch heavy dependencies before importing the app ─────────────────────────

# Patch motor so it never dials a real MongoDB.
_mock_motor = MagicMock()
_patchers = [
    patch("motor.motor_asyncio.AsyncIOMotorClient", return_value=_mock_motor),
]
for p in _patchers:
    p.start()

# Patch the LangGraph builder so invoke() never calls Groq or FAISS.
_fake_ai_reply = AIMessage(content="I am a mocked RAG response.")
_mock_builder = MagicMock()
_mock_builder.invoke.return_value = {"messages": [_fake_ai_reply]}

with patch("src.rag.graph_builder.builder", _mock_builder):
    from src.main import app  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _token(username: str = "testuser", role: str = "user") -> str:
    key = os.environ["JWT_SECRET"]
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": username,
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(hours=1),
    }
    return pyjwt.encode(payload, key, algorithm="HS256")


def _auth(username: str = "testuser") -> dict:
    return {"Authorization": f"Bearer {_token(username)}"}


# ── /rag/query ────────────────────────────────────────────────────────────────

def test_query_no_auth_returns_401_or_403():
    resp = client.post("/rag/query", json={"query": "hello", "session_id": "testuser_123"})
    assert resp.status_code in (401, 403)


def test_query_cross_session_returns_403(monkeypatch):
    _patch_chat_history(monkeypatch)
    resp = client.post(
        "/rag/query",
        json={"query": "hello", "session_id": "otheruser_123"},
        headers=_auth("testuser"),
    )
    assert resp.status_code == 403


def test_query_own_session_returns_result(monkeypatch):
    _patch_chat_history(monkeypatch)
    with patch("src.api.routes.builder", _mock_builder):
        resp = client.post(
            "/rag/query",
            json={"query": "hello", "session_id": "testuser_123"},
            headers=_auth("testuser"),
        )
    assert resp.status_code == 200
    assert "result" in resp.json()


# ── /rag/history/{session_id} ─────────────────────────────────────────────────

def test_history_no_auth():
    resp = client.get("/rag/history/testuser_123")
    assert resp.status_code in (401, 403)


def test_history_cross_session_403(monkeypatch):
    _patch_chat_history(monkeypatch)
    resp = client.get("/rag/history/otheruser_123", headers=_auth("testuser"))
    assert resp.status_code == 403


def test_history_own_session_200(monkeypatch):
    _patch_chat_history(monkeypatch)
    resp = client.get("/rag/history/testuser_123", headers=_auth("testuser"))
    assert resp.status_code == 200
    assert "history" in resp.json()


# ── /rag/sessions ─────────────────────────────────────────────────────────────

def test_sessions_no_auth():
    resp = client.get("/rag/sessions")
    assert resp.status_code in (401, 403)


def test_sessions_returns_list(monkeypatch):
    _patch_sessions_db(monkeypatch)
    resp = client.get("/rag/sessions", headers=_auth("testuser"))
    assert resp.status_code == 200
    assert "sessions" in resp.json()


# ── Helpers for mocking ChatHistory + DB ─────────────────────────────────────

def _patch_chat_history(monkeypatch):
    """Replace ChatHistory.get_session_history with a no-op async stub."""
    mock_history = MagicMock()
    mock_history.add_message = AsyncMock()
    mock_history.get_messages = AsyncMock(return_value=[])

    monkeypatch.setattr(
        "src.api.routes.ChatHistory.get_session_history",
        MagicMock(return_value=mock_history),
    )


def _patch_sessions_db(monkeypatch):
    """Patch MongoDB aggregate so /rag/sessions returns an empty list.

    routes.py does `from src.db.mongo_client import db` inside the function,
    so we patch the source module, not routes.
    """
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[])

    mock_collection = MagicMock()
    mock_collection.aggregate = MagicMock(return_value=mock_cursor)

    monkeypatch.setattr("src.db.mongo_client.db", {"chat_history": mock_collection})
