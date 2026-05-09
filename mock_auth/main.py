"""
Auth service with MongoDB-backed user storage and role-based registration.
"""

import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from pydantic import BaseModel

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "adaptive_rag")

client = AsyncIOMotorClient(MONGO_URL)
users_collection = client[DB_NAME]["users"]

app = FastAPI(title="Auth Service")


class UserBody(BaseModel):
    username: str
    password: str


async def _create_user_with_role(body: UserBody, role: str):
    existing = await users_collection.find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=409, detail="username already exists")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    await users_collection.insert_one({
        "username": body.username,
        "password": hashed,
        "role": role,
        "created_at": datetime.utcnow(),
    })
    return {"status": "ok", "role": role}


@app.post("/api/init")
def init():
    return {"api_token": "dev_token_local"}


@app.post("/api/create_user")
async def create_user(body: UserBody):
    return await _create_user_with_role(body, role="user")


@app.post("/api/create_admin")
async def create_admin(body: UserBody):
    return await _create_user_with_role(body, role="admin")


@app.post("/api/login")
async def login(body: UserBody):
    user = await users_collection.find_one({"username": body.username})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"]):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return {"jwt": f"session_{body.username}", "role": user["role"]}