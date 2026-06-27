"""
Auth service with MongoDB-backed user storage, bcrypt password hashing,
and signed JWT issuance.
"""

import os
import re
import time
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import FastAPI, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "adaptive_rag")

# Shared signing config — MUST match the backend's JWT verification config.
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALG = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24h

# Login rate limiting (in-memory, per-username).
MAX_FAILED_ATTEMPTS = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
LOCKOUT_SECONDS = int(os.getenv("LOCKOUT_SECONDS", "300"))  # 5 min

client = AsyncIOMotorClient(MONGO_URL)
users_collection = client[DB_NAME]["users"]

app = FastAPI(title="Auth Service")

# username -> {"count": int, "first_attempt": epoch_seconds}
_failed_attempts: dict[str, dict] = {}


class UserBody(BaseModel):
    username: str
    password: str


def _validate_password(password: str) -> None:
    """Enforce a minimum password policy. Raises HTTP 422 on failure."""
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(
            status_code=422,
            detail="password must contain at least one letter and one number",
        )


def _validate_username(username: str) -> None:
    """Enforce a basic username policy. Raises HTTP 422 on failure."""
    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,32}", username):
        raise HTTPException(
            status_code=422,
            detail="username must be 3-32 chars (letters, digits, . _ - only)",
        )


def _issue_token(username: str, role: str) -> str:
    """Create a signed JWT for the given user."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _check_rate_limit(username: str) -> None:
    """Block login if the user has exceeded the failed-attempt threshold."""
    entry = _failed_attempts.get(username)
    if not entry:
        return
    elapsed = time.time() - entry["first_attempt"]
    if elapsed > LOCKOUT_SECONDS:
        _failed_attempts.pop(username, None)  # window expired
        return
    if entry["count"] >= MAX_FAILED_ATTEMPTS:
        retry_in = int(LOCKOUT_SECONDS - elapsed)
        raise HTTPException(
            status_code=429,
            detail=f"too many failed attempts; try again in {retry_in}s",
        )


def _record_failure(username: str) -> None:
    entry = _failed_attempts.get(username)
    if not entry or time.time() - entry["first_attempt"] > LOCKOUT_SECONDS:
        _failed_attempts[username] = {"count": 1, "first_attempt": time.time()}
    else:
        entry["count"] += 1


async def _create_user_with_role(body: UserBody, role: str):
    _validate_username(body.username)
    _validate_password(body.password)

    existing = await users_collection.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="username already exists")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    await users_collection.insert_one({
        "username": body.username,
        "password": hashed,
        "role": role,
        "created_at": datetime.now(timezone.utc),
    })
    return {"status": "ok", "role": role}


@app.post("/api/create_user")
async def create_user(body: UserBody):
    return await _create_user_with_role(body, role="user")


@app.post("/api/create_admin")
async def create_admin(body: UserBody):
    return await _create_user_with_role(body, role="admin")


@app.post("/api/login")
async def login(body: UserBody, request: Request):
    _check_rate_limit(body.username)

    user = await users_collection.find_one({"username": body.username})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"]):
        _record_failure(body.username)
        raise HTTPException(status_code=401, detail="invalid credentials")

    # Successful login clears the failure counter.
    _failed_attempts.pop(body.username, None)
    token = _issue_token(body.username, user["role"])
    return {"jwt": token, "role": user["role"]}
