"""
Document upload and processing module.
Stores chunks in both a per-session FAISS index and the global index.
"""

import os
import tempfile

from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.rag.retriever_setup import retriever_chain, store_session_docs
from src.tools.common_tools import enhance_description_with_llm


def documents(description: str, file: UploadFile, session_id: str) -> bool:
    """
    Process and store an uploaded document.

    Chunks the document, persists it in:
      - a per-session FAISS index (so this session always searches its own docs)
      - the global FAISS index (fallback for sessions without uploads)

    Args:
        description: User-provided document description.
        file: The uploaded file (PDF or TXT).
        session_id: The chat session that owns this upload.

    Returns:
        True on success, raises HTTPException on failure.
    """
    filename = file.filename
    if not filename.endswith(".pdf") and not filename.endswith(".txt"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")

    file_bytes = file.file.read()

    with tempfile.NamedTemporaryFile(
        delete=False, suffix=os.path.splitext(filename)[1]
    ) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    if filename.endswith(".pdf"):
        loader = PyPDFLoader(tmp_path)
    else:
        loader = TextLoader(tmp_path, encoding="utf-8")

    try:
        docs = loader.load()
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error loading file: {e}")
    finally:
        os.unlink(tmp_path)

    enhanced_description = enhance_description_with_llm(description)

    # Also update the legacy global description.txt so the global retriever
    # has a useful tool description.
    with open("description.txt", "w", encoding="utf-8") as f:
        f.write(enhanced_description)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    chunks = splitter.split_documents(docs)

    # Store in per-session index (primary) and global index (fallback)
    store_session_docs(session_id, chunks, enhanced_description)
    retriever_chain(chunks)

    return True
