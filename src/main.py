"""
Main FastAPI application entry point.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router

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

app.include_router(router)
app.state.description_ = ""


@app.get("/")
async def root():
    """Root endpoint to verify API is running."""
    return {"message": "Adaptive RAG API is running"}
