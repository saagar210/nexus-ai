"""Settings and system API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from ..core.database import get_db
from ..core.config import settings
from ..models.database import UserSettings
from ..models.schemas import (
    SettingsUpdate, SettingsResponse, WatchFolder,
    ModelInfo, ModelStatus, UserProfile
)
from ..services.ollama_service import ollama_service
from ..services.memory_service import memory_service
from ..services.file_watcher import file_watcher

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current settings"""
    # Get watch folders from settings
    watch_folders = [
        WatchFolder(path=str(settings.DOCUMENTS_DIR), enabled=True, recursive=True)
    ]

    for folder in settings.WATCH_FOLDERS:
        watch_folders.append(WatchFolder(path=folder, enabled=True, recursive=True))

    # Get available models
    models_list = await ollama_service.list_models()
    available_models = [m["name"] for m in models_list]

    # Get user profile
    profile = await memory_service.get_user_profile(db)

    return SettingsResponse(
        watch_folders=watch_folders,
        available_models=available_models,
        model_routing=settings.MODEL_ROUTING,
        user_profile=profile
    )


@router.put("/")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update settings"""
    # This would persist settings - for now just returns success
    # In production, store in UserSettings table or .env

    if data.watch_folders:
        for folder in data.watch_folders:
            if folder.enabled:
                file_watcher.add_watch_folder(folder.path)
            else:
                file_watcher.remove_watch_folder(folder.path)

    return {"success": True, "message": "Settings updated"}


@router.get("/models", response_model=ModelStatus)
async def get_models():
    """Get model status and availability"""
    ollama_running = await ollama_service.check_health()

    models_info = []
    required_models = [
        ("llama3.1:8b", "Fast general chat", "4.7 GB"),
        ("mistral:7b", "Alternative fast model", "4.1 GB"),
        ("qwen2.5:14b", "Document analysis and RAG", "9.0 GB"),
        ("llama3.1:70b-q4", "High-quality writing", "40 GB"),
    ]

    available_models = []
    if ollama_running:
        models_list = await ollama_service.list_models()
        available_models = [m["name"] for m in models_list]

    for name, description, size in required_models:
        models_info.append(ModelInfo(
            name=name,
            size=size,
            available=name in available_models,
            description=description
        ))

    return ModelStatus(
        models=models_info,
        ollama_running=ollama_running
    )


@router.post("/models/{model_name}/pull")
async def pull_model(model_name: str):
    """Pull a model from Ollama"""
    from fastapi.responses import StreamingResponse
    import json

    async def generate():
        async for progress in ollama_service.pull_model(model_name):
            yield f"data: {json.dumps(progress)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.get("/watcher/status")
async def get_watcher_status():
    """Get file watcher status"""
    return {
        "running": file_watcher.is_running(),
        "watched_folders": file_watcher.get_watched_folders()
    }


@router.post("/watcher/start")
async def start_watcher():
    """Start the file watcher"""
    file_watcher.start()
    return {"success": True, "message": "File watcher started"}


@router.post("/watcher/stop")
async def stop_watcher():
    """Stop the file watcher"""
    file_watcher.stop()
    return {"success": True, "message": "File watcher stopped"}


@router.post("/watcher/folders")
async def add_watch_folder(path: str):
    """Add a folder to watch"""
    success = file_watcher.add_watch_folder(path)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid folder path")
    return {"success": True, "message": f"Now watching {path}"}


@router.get("/watch-folders")
async def get_watch_folders(db: AsyncSession = Depends(get_db)):
    """Get list of watch folders with metadata"""
    import os
    from sqlalchemy import select, func
    from ..models.database import Document

    folders = []
    watched = file_watcher.get_watched_folders()

    for i, path in enumerate(watched):
        # Count documents from this folder
        doc_count = 0
        try:
            result = await db.execute(
                select(func.count(Document.id)).where(
                    Document.file_path.like(f"{path}%")
                )
            )
            doc_count = result.scalar() or 0
        except Exception:
            pass

        folders.append({
            "id": str(i),
            "path": path,
            "enabled": True,
            "recursive": True,
            "is_active": os.path.exists(path),
            "document_count": doc_count
        })

    return folders


@router.post("/watch-folders")
async def add_watch_folder_new(data: dict):
    """Add a new watch folder"""
    import os
    path = data.get("path", "").strip()

    # Expand home directory
    if path.startswith("~"):
        path = os.path.expanduser(path)

    if not path or not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Invalid folder path")

    success = file_watcher.add_watch_folder(path)
    if not success:
        raise HTTPException(status_code=400, detail="Could not add folder")

    return {
        "id": str(len(file_watcher.get_watched_folders()) - 1),
        "path": path,
        "enabled": True,
        "recursive": True,
        "is_active": True,
        "document_count": 0
    }


@router.delete("/watch-folders/{folder_id}")
async def remove_watch_folder(folder_id: str):
    """Remove a watch folder"""
    try:
        idx = int(folder_id)
        folders = file_watcher.get_watched_folders()
        if 0 <= idx < len(folders):
            file_watcher.remove_watch_folder(folders[idx])
            return {"success": True}
    except (ValueError, IndexError):
        pass

    raise HTTPException(status_code=404, detail="Folder not found")


@router.get("/models/list")
async def list_ollama_models():
    """List all installed Ollama models with metadata"""
    models_list = await ollama_service.list_models()
    return [
        {
            "name": m.get("name", ""),
            "size": m.get("size", 0),
            "digest": m.get("digest", ""),
            "modified_at": m.get("modified_at", "")
        }
        for m in models_list
    ]


@router.post("/clear-all")
async def clear_all_data(db: AsyncSession = Depends(get_db)):
    """Clear all user data - USE WITH CAUTION"""
    from sqlalchemy import delete
    from ..models.database import (
        Session, Message, Document, DocumentChunk,
        Project, ProjectIteration, Memory, WritingDraft, WebCapture
    )

    # Delete in order of dependencies
    await db.execute(delete(Message))
    await db.execute(delete(DocumentChunk))
    await db.execute(delete(ProjectIteration))
    await db.execute(delete(Session))
    await db.execute(delete(Document))
    await db.execute(delete(Project))
    await db.execute(delete(Memory))
    await db.execute(delete(WritingDraft))
    await db.execute(delete(WebCapture))
    await db.commit()

    return {"success": True, "message": "All data cleared"}


@router.get("/health")
async def health_check():
    """System health check"""
    ollama_running = await ollama_service.check_health()

    return {
        "status": "healthy",
        "ollama": "connected" if ollama_running else "disconnected",
        "file_watcher": "running" if file_watcher.is_running() else "stopped",
        "version": settings.APP_VERSION
    }


@router.get("/export")
async def export_all_data(db: AsyncSession = Depends(get_db)):
    """Export all user data"""
    from sqlalchemy import select
    from ..models.database import Session, Message, Document, Project, Memory, WritingDraft

    # Get all data
    sessions = (await db.execute(select(Session))).scalars().all()
    messages = (await db.execute(select(Message))).scalars().all()
    documents = (await db.execute(select(Document))).scalars().all()
    projects = (await db.execute(select(Project))).scalars().all()
    memories = await memory_service.export_all(db)

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "sessions": [
            {"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()}
            for s in sessions
        ],
        "messages": [
            {
                "id": m.id,
                "session_id": m.session_id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ],
        "documents": [
            {"id": d.id, "title": d.title, "file_path": d.file_path, "file_type": d.file_type}
            for d in documents
        ],
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "status": p.status.value,
                "requirements": p.requirements,
                "goals": p.goals
            }
            for p in projects
        ],
        "memories": memories
    }


from datetime import datetime
