"""Memory API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from ..core.database import get_db
from ..models.schemas import (
    MemoryCreate, MemoryUpdate, MemoryResponse,
    MemorySearch, MemoryType, UserProfile
)
from ..services.memory_service import memory_service

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/")
async def list_memories(
    memory_type: Optional[MemoryType] = None,
    category: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List memories with optional filtering"""
    memory_types = [memory_type] if memory_type else None
    categories = [category] if category else None

    memories = await memory_service.search(
        db=db,
        query=query,
        memory_types=memory_types,
        categories=categories,
        limit=limit
    )

    return [
        {
            "id": m.id,
            "content": m.content,
            "memory_type": m.memory_type.value if hasattr(m.memory_type, 'value') else m.memory_type,
            "category": m.category if hasattr(m, 'category') else "general",
            "source": m.source,
            "confidence": m.confidence,
            "created_at": m.created_at.isoformat(),
            "updated_at": m.updated_at.isoformat()
        }
        for m in memories
    ]


@router.post("/", response_model=MemoryResponse)
async def create_memory(
    data: MemoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new memory"""
    memory = await memory_service.add_memory(
        db=db,
        content=data.content,
        memory_type=data.memory_type,
        source=data.source,
        confidence=data.confidence
    )

    return MemoryResponse(
        id=memory.id,
        content=memory.content,
        memory_type=memory.memory_type,
        source=memory.source,
        confidence=memory.confidence,
        created_at=memory.created_at,
        updated_at=memory.updated_at
    )


@router.get("/profile", response_model=UserProfile)
async def get_user_profile(db: AsyncSession = Depends(get_db)):
    """Get the user profile built from memories"""
    return await memory_service.get_user_profile(db)


@router.get("/timeline")
async def get_timeline(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get memory timeline"""
    return await memory_service.get_timeline(db, limit=limit, offset=offset)


@router.get("/export")
async def export_memories(db: AsyncSession = Depends(get_db)):
    """Export all memories as JSON"""
    return await memory_service.export_all(db)


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific memory"""
    from ..models.database import Memory
    memory = await db.get(Memory, memory_id)
    if not memory or memory.is_deleted:
        raise HTTPException(status_code=404, detail="Memory not found")

    return MemoryResponse(
        id=memory.id,
        content=memory.content,
        memory_type=memory.memory_type,
        source=memory.source,
        confidence=memory.confidence,
        created_at=memory.created_at,
        updated_at=memory.updated_at
    )


@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: str,
    data: MemoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a memory"""
    memory = await memory_service.update_memory(
        db=db,
        memory_id=memory_id,
        content=data.content,
        memory_type=data.memory_type,
        confidence=data.confidence
    )

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    return MemoryResponse(
        id=memory.id,
        content=memory.content,
        memory_type=memory.memory_type,
        source=memory.source,
        confidence=memory.confidence,
        created_at=memory.created_at,
        updated_at=memory.updated_at
    )


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a memory"""
    success = await memory_service.delete_memory(db, memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True}


@router.get("/search")
async def search_memories_get(
    query: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Search memories via GET with query parameter"""
    memories = await memory_service.search(
        db=db,
        query=query,
        limit=limit
    )

    return [
        {
            "id": m.id,
            "content": m.content,
            "memory_type": m.memory_type.value if hasattr(m.memory_type, 'value') else m.memory_type,
            "category": m.category if hasattr(m, 'category') else "general",
            "source": m.source,
            "confidence": m.confidence,
            "created_at": m.created_at.isoformat(),
            "updated_at": m.updated_at.isoformat()
        }
        for m in memories
    ]


@router.post("/search", response_model=List[MemoryResponse])
async def search_memories(
    search: MemorySearch,
    db: AsyncSession = Depends(get_db)
):
    """Search memories"""
    memories = await memory_service.search(
        db=db,
        query=search.query,
        memory_types=search.memory_types,
        min_confidence=search.min_confidence
    )

    return [
        MemoryResponse(
            id=m.id,
            content=m.content,
            memory_type=m.memory_type,
            source=m.source,
            confidence=m.confidence,
            created_at=m.created_at,
            updated_at=m.updated_at
        )
        for m in memories
    ]
