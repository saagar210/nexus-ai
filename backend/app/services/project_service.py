"""Project and task tracking service"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.database import Project, ProjectIteration
from ..models.schemas import (
    ProjectStatus, ProjectCreate, ProjectUpdate,
    ProjectResponse
)
from ..core.config import settings
from .ollama_service import ollama_service
from .rag_service import rag_service


class ProjectService:
    """Service for project tracking and AI-assisted iteration"""

    async def create_project(
        self,
        db: AsyncSession,
        data: ProjectCreate
    ) -> Project:
        """Create a new project"""
        project = Project(
            name=data.name,
            description=data.description,
            requirements=data.requirements,
            goals=data.goals,
            status=ProjectStatus.IDEATION
        )
        db.add(project)
        await db.commit()
        return project

    async def get_project(
        self,
        db: AsyncSession,
        project_id: str
    ) -> Optional[Project]:
        """Get a project by ID"""
        return await db.get(Project, project_id)

    async def list_projects(
        self,
        db: AsyncSession,
        status: Optional[ProjectStatus] = None,
        include_archived: bool = False,
        limit: int = 50
    ) -> List[Project]:
        """List projects"""
        stmt = select(Project)

        if not include_archived:
            stmt = stmt.where(Project.is_archived == False)

        if status:
            stmt = stmt.where(Project.status == status)

        stmt = stmt.order_by(Project.updated_at.desc()).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_project(
        self,
        db: AsyncSession,
        project_id: str,
        data: ProjectUpdate
    ) -> Optional[Project]:
        """Update a project"""
        project = await db.get(Project, project_id)
        if not project:
            return None

        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description
        if data.status is not None:
            project.status = data.status
        if data.requirements is not None:
            project.requirements = data.requirements
        if data.goals is not None:
            project.goals = data.goals
        if data.notes is not None:
            project.notes = data.notes

        project.updated_at = datetime.utcnow()
        await db.commit()
        return project

    async def delete_project(
        self,
        db: AsyncSession,
        project_id: str
    ) -> bool:
        """Delete a project"""
        project = await db.get(Project, project_id)
        if not project:
            return False

        await db.delete(project)
        await db.commit()
        return True

    async def archive_project(
        self,
        db: AsyncSession,
        project_id: str
    ) -> bool:
        """Archive a project"""
        project = await db.get(Project, project_id)
        if not project:
            return False

        project.is_archived = True
        project.status = ProjectStatus.ARCHIVED
        await db.commit()
        return True

    async def iterate_on_project(
        self,
        db: AsyncSession,
        project_id: str,
        message: str,
        include_documents: bool = True
    ) -> Dict[str, Any]:
        """Have AI iterate on a project based on user input"""
        project = await db.get(Project, project_id)
        if not project:
            return {"error": "Project not found"}

        # Get relevant documents if requested
        doc_context = ""
        documents_referenced = []
        if include_documents and project.related_documents:
            context, docs = await rag_service.get_context_for_query(
                f"{project.name} {message}",
                top_k=3
            )
            if context:
                doc_context = f"\n\nRelated documents:\n{context}"
                documents_referenced = docs

        # Build project context
        project_context = f"""Project: {project.name}

Description: {project.description or 'No description'}

Requirements:
{chr(10).join(f'- {r}' for r in project.requirements) if project.requirements else 'No requirements defined'}

Goals:
{chr(10).join(f'- {g}' for g in project.goals) if project.goals else 'No goals defined'}

Current Status: {project.status.value}

Notes: {project.notes or 'No notes'}
{doc_context}"""

        # Get previous iterations for context
        prev_iterations = await self.get_project_iterations(db, project_id, limit=5)
        iteration_context = ""
        if prev_iterations:
            iteration_context = "\n\nPrevious discussion:\n"
            for it in prev_iterations:
                iteration_context += f"\nUser: {it.user_message[:200]}...\n"
                if it.ai_response:
                    iteration_context += f"AI: {it.ai_response[:200]}...\n"

        prompt = f"""You are helping iterate on a project. Consider the project details, previous discussions, and the user's current input.

{project_context}
{iteration_context}

User's current input: {message}

Provide helpful suggestions, identify potential issues, or help refine the requirements. Be specific and actionable.

Response:"""

        model = settings.MODELS['quality']

        result = await ollama_service.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0.7}
        )

        response = result.get('response', '')

        # Save iteration
        iteration = ProjectIteration(
            project_id=project_id,
            user_message=message,
            ai_response=response,
            model_used=model,
            documents_referenced=documents_referenced
        )
        db.add(iteration)

        # Update project timestamp
        project.updated_at = datetime.utcnow()
        await db.commit()

        return {
            "response": response,
            "model_used": model,
            "documents_referenced": documents_referenced,
            "iteration_id": iteration.id
        }

    async def get_project_iterations(
        self,
        db: AsyncSession,
        project_id: str,
        limit: int = 20
    ) -> List[ProjectIteration]:
        """Get iterations for a project"""
        stmt = (
            select(ProjectIteration)
            .where(ProjectIteration.project_id == project_id)
            .order_by(ProjectIteration.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def add_document_to_project(
        self,
        db: AsyncSession,
        project_id: str,
        document_id: str
    ) -> bool:
        """Link a document to a project"""
        project = await db.get(Project, project_id)
        if not project:
            return False

        docs = project.related_documents or []
        if document_id not in docs:
            docs.append(document_id)
            project.related_documents = docs
            await db.commit()

        return True

    async def remove_document_from_project(
        self,
        db: AsyncSession,
        project_id: str,
        document_id: str
    ) -> bool:
        """Unlink a document from a project"""
        project = await db.get(Project, project_id)
        if not project:
            return False

        docs = project.related_documents or []
        if document_id in docs:
            docs.remove(document_id)
            project.related_documents = docs
            await db.commit()

        return True

    async def get_project_summary(
        self,
        db: AsyncSession,
        project_id: str
    ) -> Dict[str, Any]:
        """Get an AI-generated summary of project status"""
        project = await db.get(Project, project_id)
        if not project:
            return {"error": "Project not found"}

        iterations = await self.get_project_iterations(db, project_id, limit=10)

        prompt = f"""Summarize the current state of this project:

Project: {project.name}
Description: {project.description}
Status: {project.status.value}
Requirements: {', '.join(project.requirements) if project.requirements else 'None'}
Goals: {', '.join(project.goals) if project.goals else 'None'}

Number of iterations/discussions: {len(iterations)}

Provide a brief summary of:
1. Current progress
2. Key decisions made
3. Next steps recommended

Summary:"""

        model = settings.MODELS['document']

        result = await ollama_service.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0.5}
        )

        return {
            "summary": result.get('response', ''),
            "project_id": project_id,
            "iteration_count": len(iterations)
        }


# Singleton instance
project_service = ProjectService()
