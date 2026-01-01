"""Web capture (bookmarklet) API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime

from ..core.database import get_db
from ..core.config import settings
from ..models.database import WebCapture as WebCaptureModel, Document
from ..models.schemas import WebCapture, WebCaptureResponse
from ..services.document_processor import document_processor
from ..services.rag_service import rag_service
from ..services.ollama_service import ollama_service

router = APIRouter(prefix="/webcapture", tags=["webcapture"])


@router.post("/", response_model=WebCaptureResponse)
async def capture_webpage(
    data: WebCapture,
    db: AsyncSession = Depends(get_db)
):
    """Capture and process a webpage from bookmarklet"""
    # Process the web content
    processed = document_processor.process_web_content(
        html=data.content,
        url=data.url,
        title=data.title
    )

    # Create web capture record
    capture = WebCaptureModel(
        url=data.url,
        title=processed['title'],
        raw_content=data.content,
        clean_content=processed['content'],
        captured_at=data.captured_at or datetime.utcnow()
    )
    db.add(capture)
    await db.flush()

    # Generate summary and key points using AI
    summary_prompt = f"""Summarize this article in 2-3 sentences using simple, clear language:

{processed['content'][:3000]}

Summary:"""

    keypoints_prompt = f"""Extract 3-5 key points from this article as a bullet list:

{processed['content'][:3000]}

Key points (just the bullet points, no introduction):"""

    tags_prompt = f"""Suggest 3-5 single-word tags for this article (comma-separated):

Title: {processed['title']}
Content preview: {processed['content'][:500]}

Tags:"""

    model = settings.MODELS['document']

    # Generate summary
    summary_result = await ollama_service.generate(
        model=model,
        prompt=summary_prompt,
        options={"temperature": 0.3}
    )
    summary = summary_result.get('response', '')

    # Generate key points
    keypoints_result = await ollama_service.generate(
        model=model,
        prompt=keypoints_prompt,
        options={"temperature": 0.3}
    )
    keypoints_text = keypoints_result.get('response', '')
    key_points = [
        line.strip().lstrip('•-*').strip()
        for line in keypoints_text.split('\n')
        if line.strip() and not line.strip().startswith('#')
    ]

    # Generate tags
    tags_result = await ollama_service.generate(
        model=model,
        prompt=tags_prompt,
        options={"temperature": 0.3}
    )
    tags_text = tags_result.get('response', '')
    tags = [t.strip().lower() for t in tags_text.split(',') if t.strip()][:5]

    # Update capture record
    capture.summary = summary
    capture.key_points = key_points
    capture.tags = tags
    capture.processed_at = datetime.utcnow()

    # Index in RAG system
    try:
        doc = await rag_service.index_document(
            db=db,
            content=processed['content'],
            title=processed['title'],
            tags=tags,
            source_url=data.url,
            metadata={'source': 'web_capture', 'capture_id': capture.id}
        )
        capture.document_id = doc.id
    except Exception as e:
        print(f"Error indexing web capture: {e}")

    await db.commit()

    return WebCaptureResponse(
        id=capture.id,
        url=capture.url,
        title=capture.title,
        summary=summary,
        key_points=key_points,
        tags=tags,
        indexed=capture.document_id is not None
    )


@router.get("/bookmarklet")
async def get_bookmarklet():
    """Get the JavaScript bookmarklet code"""
    # This bookmarklet captures the page and sends it to the local API
    bookmarklet = f"""javascript:(function(){{
    const url = window.location.href;
    const title = document.title;
    const content = document.documentElement.outerHTML;

    fetch('http://localhost:{settings.PORT}/api/webcapture/', {{
        method: 'POST',
        headers: {{'Content-Type': 'application/json'}},
        body: JSON.stringify({{url, title, content}})
    }})
    .then(r => r.json())
    .then(data => {{
        alert('Saved to Nexus AI!\\n\\n' + data.summary.substring(0, 200) + '...');
    }})
    .catch(e => {{
        alert('Error saving to Nexus AI: ' + e.message);
    }});
}})();"""

    # Return as installable format
    return {
        "bookmarklet": bookmarklet,
        "instructions": [
            "1. Create a new bookmark in your browser",
            "2. Name it 'Save to Nexus AI'",
            "3. Paste the bookmarklet code as the URL",
            "4. Click the bookmark on any page to save it to Nexus AI"
        ],
        "note": f"Make sure Nexus AI is running on port {settings.PORT}"
    }


@router.get("/")
async def list_captures(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List captured webpages"""
    result = await db.execute(
        select(WebCaptureModel)
        .order_by(WebCaptureModel.captured_at.desc())
        .limit(limit)
    )
    captures = result.scalars().all()

    return [
        {
            "id": c.id,
            "url": c.url,
            "title": c.title,
            "summary": c.summary,
            "key_points": c.key_points,
            "tags": c.tags,
            "captured_at": c.captured_at.isoformat(),
            "processed": c.processed_at is not None,
            "indexed": c.document_id is not None
        }
        for c in captures
    ]


@router.get("/{capture_id}")
async def get_capture(
    capture_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific web capture"""
    capture = await db.get(WebCaptureModel, capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    return {
        "id": capture.id,
        "url": capture.url,
        "title": capture.title,
        "summary": capture.summary,
        "key_points": capture.key_points,
        "tags": capture.tags,
        "clean_content": capture.clean_content,
        "captured_at": capture.captured_at.isoformat(),
        "processed_at": capture.processed_at.isoformat() if capture.processed_at else None,
        "document_id": capture.document_id
    }


@router.delete("/{capture_id}")
async def delete_capture(
    capture_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a web capture"""
    capture = await db.get(WebCaptureModel, capture_id)
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    # Also delete associated document if exists
    if capture.document_id:
        await rag_service.delete_document(db, capture.document_id)

    await db.delete(capture)
    await db.commit()

    return {"success": True}
