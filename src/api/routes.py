"""
API routes for RAG operations.
"""

from fastapi import APIRouter, UploadFile, File, Header, Depends
from langchain_core.messages import HumanMessage, AIMessage

from src.api.security import CurrentUser, get_current_user, require_session_owner
from src.memory.chat_history_mongo import ChatHistory
from src.models.query_request import QueryRequest
from src.rag.document_upload import documents
from src.rag.graph_builder import builder

router = APIRouter()


@router.post("/rag/query")
async def rag_query(req: QueryRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Process a RAG query and return the result.

    Args:
        req: The query request containing query text and session_id.
        user: The authenticated caller (from the verified JWT).

    Returns:
        The generated response from the RAG pipeline.
    """
    require_session_owner(req.session_id, user)
    chat_history = ChatHistory.get_session_history(req.session_id)
    await chat_history.add_message(HumanMessage(content=req.query))

    # Fetch full history
    messages = await chat_history.get_messages()
    result = builder.invoke({
        "messages": messages,
        "session_id": req.session_id,
    })
    output_text = result["messages"][-1].content

    # Save assistant message
    await chat_history.add_message(AIMessage(content=output_text))

    return {"result": result["messages"][-1]}


@router.get("/rag/history/{session_id}")
async def get_history(session_id: str, user: CurrentUser = Depends(get_current_user)):
    """Return chat history for a session as a list of {role, content} objects."""
    require_session_owner(session_id, user)
    chat_history = ChatHistory.get_session_history(session_id)
    messages = await chat_history.get_messages()
    return {
        "history": [
            {"role": msg.type, "content": msg.content}
            for msg in messages
        ]
    }


@router.get("/rag/sessions")
async def get_sessions(user: CurrentUser = Depends(get_current_user)):
    """Return all chat sessions for the authenticated user with title and creation time."""
    from src.db.mongo_client import db
    collection = db["chat_history"]

    # Find all session_ids that belong to this user (prefix: username_)
    prefix = f"{user.username}_"
    pipeline = [
        {"$match": {"session_id": {"$regex": f"^{prefix}"}}},
        {"$sort": {"timestamp": 1}},
        {"$group": {
            "_id": "$session_id",
            "title": {"$first": {"$cond": [{"$eq": ["$type", "human"]}, "$content", None]}},
            "created_at": {"$first": "$timestamp"},
            "last_updated": {"$last": "$timestamp"},
        }},
        {"$sort": {"created_at": 1}},
    ]
    docs = await collection.aggregate(pipeline).to_list(length=200)

    sessions = []
    for d in docs:
        title = d.get("title") or "New Conversation"
        sessions.append({
            "session_id": d["_id"],
            "title": title[:60] + ("..." if len(title) > 60 else ""),
            "created_at": d["created_at"].isoformat() + 'Z' if d.get("created_at") else None,
            "last_updated": d["last_updated"].isoformat() + 'Z' if d.get("last_updated") else None,
        })
    return {"sessions": sessions}


@router.post("/rag/documents/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Header(..., alias="X-Description"),
    session_id: str = Header(..., alias="X-Session-ID"),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Upload a document for RAG processing.

    Stores the document in both a per-session index (so the owning session
    always searches its own docs) and the global index.

    Args:
        file: The file to upload (PDF or TXT).
        description: Document description provided via header.
        session_id: The chat session that owns this upload (X-Session-ID header).

    Returns:
        Upload status and session_id.
    """
    require_session_owner(session_id, user)
    status_upload = documents(description, file, session_id)
    return {"status": status_upload, "session_id": session_id}

