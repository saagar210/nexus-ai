"""Chat API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json

from ..core.database import get_db
from ..models.schemas import (
    ChatRequest, ChatResponse, SessionCreate,
    SessionResponse, SessionDetail, ChatMessage
)
from ..services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a chat message and get a response"""
    try:
        response = await chat_service.chat(
            db=db,
            message=request.message,
            session_id=request.session_id,
            model_override=request.model_override,
            include_documents=request.include_documents,
            include_memory=request.include_memory,
            project_context=request.project_context
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Stream a chat response"""
    async def generate():
        try:
            async for chunk in chat_service.chat_stream(
                db=db,
                message=request.message,
                session_id=request.session_id,
                model_override=request.model_override,
                include_documents=request.include_documents,
                include_memory=request.include_memory,
                system_prompt=request.system_prompt
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session"""
    session = await chat_service.create_session(db, data.title)
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    include_archived: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List chat sessions"""
    sessions = await chat_service.list_sessions(
        db, limit=limit, include_archived=include_archived
    )
    return [
        SessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages) if s.messages else 0
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a session with messages"""
    session = await chat_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await chat_service.get_session_messages(db, session_id)

    return SessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(messages),
        messages=[
            ChatMessage(
                role=m.role,
                content=m.content,
                timestamp=m.created_at,
                model_used=m.model_used,
                task_type=m.task_type
            )
            for m in messages
        ]
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a session"""
    success = await chat_service.delete_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.post("/sessions/{session_id}/archive")
async def archive_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Archive a session"""
    success = await chat_service.archive_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}
