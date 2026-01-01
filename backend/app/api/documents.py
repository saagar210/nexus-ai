"""Documents API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import aiofiles
from pathlib import Path
import uuid

from ..core.database import get_db
from ..core.config import settings
from ..models.database import Document
from ..models.schemas import (
    DocumentCreate, DocumentResponse, DocumentSearch,
    DocumentSearchResult
)
from ..services.rag_service import rag_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/", response_model=DocumentResponse)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Index a new document"""
    try:
        doc = await rag_service.index_document(
            db=db,
            file_path=data.file_path,
            content=data.content,
            title=data.title,
            tags=data.tags,
            source_url=data.url
        )
        return DocumentResponse(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_type=doc.file_type,
            size_bytes=doc.size_bytes,
            created_at=doc.created_at,
            indexed_at=doc.indexed_at,
            tags=doc.tags or [],
            chunk_count=doc.chunk_count
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload and index a document"""
    # Save file to documents directory
    file_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix
    file_path = settings.DOCUMENTS_DIR / f"{file_id}{ext}"

    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # Parse tags
        tag_list = []
        if tags:
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]

        # Index the document
        doc = await rag_service.index_document(
            db=db,
            file_path=str(file_path),
            title=title or file.filename,
            tags=tag_list
        )

        return DocumentResponse(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_type=doc.file_type,
            size_bytes=doc.size_bytes,
            created_at=doc.created_at,
            indexed_at=doc.indexed_at,
            tags=doc.tags or [],
            chunk_count=doc.chunk_count
        )
    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    file_type: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List indexed documents"""
    stmt = select(Document).where(Document.is_deleted == False)

    if file_type:
        stmt = stmt.where(Document.file_type == file_type)

    # Note: Tag filtering would need proper JSON query support
    stmt = stmt.order_by(Document.created_at.desc()).limit(limit)

    result = await db.execute(stmt)
    documents = result.scalars().all()

    return [
        DocumentResponse(
            id=doc.id,
            title=doc.title,
            file_path=doc.file_path,
            file_type=doc.file_type,
            size_bytes=doc.size_bytes,
            created_at=doc.created_at,
            indexed_at=doc.indexed_at,
            tags=doc.tags or [],
            chunk_count=doc.chunk_count
        )
        for doc in documents
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a document by ID"""
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        file_path=doc.file_path,
        file_type=doc.file_type,
        size_bytes=doc.size_bytes,
        created_at=doc.created_at,
        indexed_at=doc.indexed_at,
        tags=doc.tags or [],
        chunk_count=doc.chunk_count
    )


@router.post("/search", response_model=List[DocumentSearchResult])
async def search_documents(
    search: DocumentSearch,
    db: AsyncSession = Depends(get_db)
):
    """Search documents using semantic search"""
    results = await rag_service.search(
        query=search.query,
        top_k=search.top_k,
        filter_tags=search.filter_tags,
        file_types=search.file_types
    )
    return results


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a document"""
    await rag_service.delete_document(db, document_id)
    return {"success": True}


@router.post("/{document_id}/reindex", response_model=DocumentResponse)
async def reindex_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Reindex a document"""
    doc = await rag_service.reindex_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        file_path=doc.file_path,
        file_type=doc.file_type,
        size_bytes=doc.size_bytes,
        created_at=doc.created_at,
        indexed_at=doc.indexed_at,
        tags=doc.tags or [],
        chunk_count=doc.chunk_count
    )


@router.get("/stats/overview")
async def get_document_stats(db: AsyncSession = Depends(get_db)):
    """Get document statistics"""
    result = await db.execute(
        select(Document).where(Document.is_deleted == False)
    )
    documents = result.scalars().all()

    type_counts = {}
    total_size = 0
    total_chunks = 0

    for doc in documents:
        type_counts[doc.file_type] = type_counts.get(doc.file_type, 0) + 1
        total_size += doc.size_bytes
        total_chunks += doc.chunk_count

    rag_stats = rag_service.get_stats()

    return {
        "total_documents": len(documents),
        "total_size_bytes": total_size,
        "total_chunks": total_chunks,
        "documents_by_type": type_counts,
        "rag_stats": rag_stats
    }
