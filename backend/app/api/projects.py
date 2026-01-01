"""Projects API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from ..core.database import get_db
from ..models.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectStatus, ProjectIteration
)
from ..services.project_service import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new project"""
    project = await project_service.create_project(db, data)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        requirements=project.requirements or [],
        goals=project.goals or [],
        notes=project.notes,
        related_documents=project.related_documents or [],
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[ProjectStatus] = None,
    include_archived: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List projects"""
    projects = await project_service.list_projects(
        db, status=status, include_archived=include_archived, limit=limit
    )

    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            status=p.status,
            requirements=p.requirements or [],
            goals=p.goals or [],
            notes=p.notes,
            related_documents=p.related_documents or [],
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in projects
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a project by ID"""
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        requirements=project.requirements or [],
        goals=project.goals or [],
        notes=project.notes,
        related_documents=project.related_documents or [],
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a project"""
    project = await project_service.update_project(db, project_id, data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        requirements=project.requirements or [],
        goals=project.goals or [],
        notes=project.notes,
        related_documents=project.related_documents or [],
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a project"""
    success = await project_service.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


@router.post("/{project_id}/archive")
async def archive_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Archive a project"""
    success = await project_service.archive_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


@router.post("/{project_id}/iterate")
async def iterate_on_project(
    project_id: str,
    data: ProjectIteration,
    db: AsyncSession = Depends(get_db)
):
    """Iterate on a project with AI assistance"""
    result = await project_service.iterate_on_project(
        db=db,
        project_id=project_id,
        message=data.message,
        include_documents=data.include_documents
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/{project_id}/iterations")
async def get_project_iterations(
    project_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get project iterations"""
    iterations = await project_service.get_project_iterations(
        db, project_id, limit=limit
    )

    return [
        {
            "id": it.id,
            "user_message": it.user_message,
            "ai_response": it.ai_response,
            "model_used": it.model_used,
            "documents_referenced": it.documents_referenced,
            "created_at": it.created_at.isoformat()
        }
        for it in iterations
    ]


@router.get("/{project_id}/summary")
async def get_project_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get AI-generated project summary"""
    result = await project_service.get_project_summary(db, project_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/{project_id}/documents/{document_id}")
async def add_document_to_project(
    project_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Link a document to a project"""
    success = await project_service.add_document_to_project(
        db, project_id, document_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


@router.delete("/{project_id}/documents/{document_id}")
async def remove_document_from_project(
    project_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Unlink a document from a project"""
    success = await project_service.remove_document_from_project(
        db, project_id, document_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}
