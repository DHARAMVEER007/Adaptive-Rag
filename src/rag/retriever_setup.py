"""
Retriever setup and vector store configuration.
Uses HuggingFace FastEmbed for free local embeddings, persists FAISS index to disk.
Supports both a global index and per-session indexes for uploaded documents.
"""

import os

from langchain_core.documents import Document
from langchain_core.tools import create_retriever_tool
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

FAISS_INDEX_PATH = "/app/data/faiss_index"
SESSION_INDEX_BASE = "/app/data/sessions"

embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

# In-memory caches to avoid repeated disk reads within the same process
_global_vectorstore: FAISS | None = None
_session_vectorstores: dict[str, FAISS] = {}


# ── Global index ──────────────────────────────────────────────────────────────

def _load_global() -> FAISS:
    global _global_vectorstore
    if _global_vectorstore is not None:
        return _global_vectorstore
    if os.path.exists(FAISS_INDEX_PATH):
        print("Loading global FAISS index from disk")
        _global_vectorstore = FAISS.load_local(
            FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True
        )
    else:
        print("No global FAISS index — creating dummy")
        dummy = Document(
            page_content="No documents uploaded yet. Please upload a document first.",
            metadata={"source": "init"},
        )
        _global_vectorstore = FAISS.from_documents([dummy], embeddings)
    return _global_vectorstore


def retriever_chain(chunks: list[Document]) -> bool:
    """Merge chunks into the global FAISS index and persist."""
    global _global_vectorstore
    try:
        existing = _load_global()
        new_store = FAISS.from_documents(chunks, embeddings)
        existing.merge_from(new_store)
        _global_vectorstore = existing
        os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
        _global_vectorstore.save_local(FAISS_INDEX_PATH)
        print(f"Global FAISS updated with {len(chunks)} chunks")
        return True
    except Exception as e:
        print(f"Error updating global FAISS: {e}")
        return False


# ── Per-session index ─────────────────────────────────────────────────────────

def _session_paths(session_id: str) -> tuple[str, str]:
    base = os.path.join(SESSION_INDEX_BASE, session_id)
    return os.path.join(base, "faiss_index"), os.path.join(base, "description.txt")


def session_has_docs(session_id: str) -> bool:
    """Return True if a per-session FAISS index exists on disk."""
    index_path, _ = _session_paths(session_id)
    return os.path.exists(index_path)


def store_session_docs(session_id: str, chunks: list[Document], description: str) -> bool:
    """Persist chunks to a per-session FAISS index and save its description."""
    global _session_vectorstores
    index_path, desc_path = _session_paths(session_id)
    os.makedirs(os.path.dirname(index_path), exist_ok=True)
    try:
        if session_id in _session_vectorstores:
            store = _session_vectorstores[session_id]
            new_store = FAISS.from_documents(chunks, embeddings)
            store.merge_from(new_store)
        elif os.path.exists(index_path):
            store = FAISS.load_local(
                index_path, embeddings, allow_dangerous_deserialization=True
            )
            new_store = FAISS.from_documents(chunks, embeddings)
            store.merge_from(new_store)
        else:
            store = FAISS.from_documents(chunks, embeddings)

        store.save_local(index_path)
        _session_vectorstores[session_id] = store

        with open(desc_path, "w", encoding="utf-8") as f:
            f.write(description)

        print(f"Session FAISS [{session_id}] updated with {len(chunks)} chunks")
        return True
    except Exception as e:
        print(f"Error storing session docs [{session_id}]: {e}")
        return False


def _load_session_store(session_id: str) -> FAISS:
    if session_id in _session_vectorstores:
        return _session_vectorstores[session_id]
    index_path, _ = _session_paths(session_id)
    store = FAISS.load_local(
        index_path, embeddings, allow_dangerous_deserialization=True
    )
    _session_vectorstores[session_id] = store
    return store


# ── Public retriever factory ──────────────────────────────────────────────────

def get_retriever(session_id: str | None = None):
    """
    Return a LangChain retriever tool.
    If the session has uploaded documents, returns a session-scoped retriever.
    Otherwise falls back to the global index.
    """
    if session_id and session_has_docs(session_id):
        _, desc_path = _session_paths(session_id)
        vectorstore = _load_session_store(session_id)
        description = "documents uploaded for this session"
        if os.path.exists(desc_path):
            with open(desc_path, encoding="utf-8") as f:
                description = f.read()
        print(f"Using session-specific retriever for [{session_id}]")
    else:
        vectorstore = _load_global()
        description = "uploaded documents"
        if os.path.exists("description.txt"):
            with open("description.txt", encoding="utf-8") as f:
                description = f.read()
        print("Using global retriever")

    return create_retriever_tool(
        vectorstore.as_retriever(search_kwargs={"k": 4}),
        "retriever_customer_uploaded_documents",
        f"Use this tool **only** to answer questions about: {description}\n"
        "Do not use this tool for anything else.",
    )
