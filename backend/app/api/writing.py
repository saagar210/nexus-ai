"""Writing Studio API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from ..core.database import get_db
from ..models.schemas import (
    WritingRequest, WritingResponse, WritingRefine, WritingMode
)
from ..services.writing_service import writing_service

router = APIRouter(prefix="/writing", tags=["writing"])


@router.post("/generate", response_model=WritingResponse)
async def generate_drafts(
    request: WritingRequest,
    num_drafts: int = 2,
    db: AsyncSession = Depends(get_db)
):
    """Generate writing drafts"""
    return await writing_service.generate_drafts(
        db=db,
        request=request,
        num_drafts=num_drafts
    )


@router.post("/refine", response_model=WritingResponse)
async def refine_draft(
    request: WritingRefine,
    db: AsyncSession = Depends(get_db)
):
    """Refine a draft based on feedback"""
    return await writing_service.refine_draft(
        db=db,
        draft=request.draft,
        feedback=request.feedback,
        mode=request.mode
    )


@router.post("/expand-bullets", response_model=WritingResponse)
async def expand_bullets(
    bullets: List[str],
    mode: WritingMode = WritingMode.GENERAL,
    context: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Expand bullet points into prose"""
    return await writing_service.expand_bullets(
        db=db,
        bullets=bullets,
        mode=mode,
        context=context
    )


@router.post("/email-response", response_model=WritingResponse)
async def draft_email_response(
    email_thread: str,
    instructions: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Generate an email response to a thread"""
    return await writing_service.draft_email_response(
        db=db,
        email_thread=email_thread,
        instructions=instructions
    )


@router.post("/learn-style")
async def learn_writing_style(
    sample_text: str,
    text_type: str = "general",
    db: AsyncSession = Depends(get_db)
):
    """Analyze a sample to learn user's writing style"""
    return await writing_service.learn_writing_style(
        db=db,
        sample_text=sample_text,
        text_type=text_type
    )


@router.get("/drafts")
async def get_recent_drafts(
    mode: Optional[WritingMode] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get recent writing drafts"""
    drafts = await writing_service.get_recent_drafts(db, mode=mode, limit=limit)

    return [
        {
            "id": d.id,
            "mode": d.mode.value,
            "input_text": d.input_text[:100] + "..." if len(d.input_text) > 100 else d.input_text,
            "draft_content": d.draft_content,
            "model_used": d.model_used,
            "is_favorite": d.is_favorite,
            "created_at": d.created_at.isoformat()
        }
        for d in drafts
    ]


@router.post("/drafts/{draft_id}/favorite")
async def favorite_draft(
    draft_id: str,
    favorite: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Mark a draft as favorite"""
    success = await writing_service.favorite_draft(db, draft_id, favorite)
    if not success:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"success": True}
