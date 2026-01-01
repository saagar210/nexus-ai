"""Backup and restore service"""
import json
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.config import settings
from ..models.database import (
    Session as ChatSession, Message, Document, Memory,
    Project, ProjectIteration, WritingDraft, WebCapture, UserSettings
)


class BackupService:
    """Service for backing up and restoring data"""

    def __init__(self):
        self.backup_dir = settings.DATA_DIR / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def _get_backup_filename(self, prefix: str = "nexus_backup") -> str:
        """Generate backup filename with timestamp"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}.zip"

    async def create_full_backup(
        self,
        db: AsyncSession,
        include_documents: bool = True,
        include_chromadb: bool = True,
        encrypt: bool = False
    ) -> Path:
        """Create a full backup of all data"""
        backup_name = self._get_backup_filename()
        backup_path = self.backup_dir / backup_name
        temp_dir = self.backup_dir / f"temp_{datetime.now().timestamp()}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Export database data
            db_data = await self._export_database(db)
            db_file = temp_dir / "database.json"
            db_file.write_text(json.dumps(db_data, indent=2, default=str))

            # Copy SQLite database
            sqlite_path = settings.SQLITE_DIR / "nexus.db"
            if sqlite_path.exists():
                shutil.copy(sqlite_path, temp_dir / "nexus.db")

            # Copy ChromaDB
            if include_chromadb and settings.CHROMADB_DIR.exists():
                shutil.copytree(
                    settings.CHROMADB_DIR,
                    temp_dir / "chromadb",
                    dirs_exist_ok=True
                )

            # Copy documents
            if include_documents and settings.DOCUMENTS_DIR.exists():
                shutil.copytree(
                    settings.DOCUMENTS_DIR,
                    temp_dir / "documents",
                    dirs_exist_ok=True
                )

            # Create backup metadata
            metadata = {
                "created_at": datetime.now().isoformat(),
                "version": settings.APP_VERSION,
                "includes": {
                    "database": True,
                    "chromadb": include_chromadb,
                    "documents": include_documents
                },
                "stats": {
                    "sessions": len(db_data.get("sessions", [])),
                    "messages": len(db_data.get("messages", [])),
                    "documents": len(db_data.get("documents", [])),
                    "memories": len(db_data.get("memories", [])),
                }
            }
            (temp_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))

            # Create zip archive
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in temp_dir.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(temp_dir)
                        zipf.write(file_path, arcname)

            # Encrypt if requested
            if encrypt:
                from .encryption_service import encryption_service
                encrypted_path = encryption_service.encrypt_file(backup_path)
                backup_path.unlink()
                backup_path = encrypted_path

            return backup_path

        finally:
            # Cleanup temp directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    async def _export_database(self, db: AsyncSession) -> Dict[str, Any]:
        """Export all database tables to JSON"""
        data = {}

        # Sessions
        result = await db.execute(select(ChatSession))
        sessions = result.scalars().all()
        data["sessions"] = [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "is_archived": s.is_archived
            }
            for s in sessions
        ]

        # Messages
        result = await db.execute(select(Message))
        messages = result.scalars().all()
        data["messages"] = [
            {
                "id": m.id,
                "session_id": m.session_id,
                "role": m.role,
                "content": m.content,
                "model_used": m.model_used,
                "task_type": m.task_type,
                "routing_reason": m.routing_reason,
                "documents_used": m.documents_used,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]

        # Documents
        result = await db.execute(select(Document))
        documents = result.scalars().all()
        data["documents"] = [
            {
                "id": d.id,
                "title": d.title,
                "file_path": d.file_path,
                "file_type": d.file_type,
                "size_bytes": d.size_bytes,
                "content_hash": d.content_hash,
                "tags": d.tags,
                "doc_metadata": d.doc_metadata,
                "chunk_count": d.chunk_count,
                "source_url": d.source_url,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "indexed_at": d.indexed_at.isoformat() if d.indexed_at else None,
                "is_deleted": d.is_deleted
            }
            for d in documents
        ]

        # Memories
        result = await db.execute(select(Memory))
        memories = result.scalars().all()
        data["memories"] = [
            {
                "id": m.id,
                "content": m.content,
                "memory_type": m.memory_type.value if m.memory_type else None,
                "category": m.category,
                "source": m.source,
                "source_session_id": m.source_session_id,
                "confidence": m.confidence,
                "access_count": m.access_count,
                "last_accessed": m.last_accessed.isoformat() if m.last_accessed else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
                "is_deleted": m.is_deleted
            }
            for m in memories
        ]

        # Projects
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        data["projects"] = [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "status": p.status.value if p.status else None,
                "requirements": p.requirements,
                "goals": p.goals,
                "notes": p.notes,
                "related_documents": p.related_documents,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "is_archived": p.is_archived
            }
            for p in projects
        ]

        # Writing Drafts
        result = await db.execute(select(WritingDraft))
        drafts = result.scalars().all()
        data["writing_drafts"] = [
            {
                "id": d.id,
                "mode": d.mode.value if d.mode else None,
                "input_text": d.input_text,
                "context": d.context,
                "draft_content": d.draft_content,
                "revision_number": d.revision_number,
                "model_used": d.model_used,
                "style_notes": d.style_notes,
                "is_favorite": d.is_favorite,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in drafts
        ]

        # User Settings
        result = await db.execute(select(UserSettings))
        user_settings = result.scalars().all()
        data["user_settings"] = [
            {
                "id": s.id,
                "key": s.key,
                "value": s.value,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None
            }
            for s in user_settings
        ]

        return data

    async def restore_backup(
        self,
        db: AsyncSession,
        backup_path: Path,
        restore_documents: bool = True,
        restore_chromadb: bool = True,
        merge: bool = False
    ) -> Dict[str, Any]:
        """Restore data from a backup"""
        temp_dir = self.backup_dir / f"restore_{datetime.now().timestamp()}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        stats = {
            "sessions": 0,
            "messages": 0,
            "documents": 0,
            "memories": 0,
            "projects": 0
        }

        try:
            # Check if encrypted
            if backup_path.suffix == ".encrypted":
                from .encryption_service import encryption_service
                backup_path = encryption_service.decrypt_file(backup_path, temp_dir / "backup.zip")

            # Extract backup
            with zipfile.ZipFile(backup_path, 'r') as zipf:
                zipf.extractall(temp_dir)

            # Read metadata
            metadata_file = temp_dir / "metadata.json"
            if metadata_file.exists():
                metadata = json.loads(metadata_file.read_text())
            else:
                metadata = {}

            # Restore database
            db_file = temp_dir / "database.json"
            if db_file.exists():
                db_data = json.loads(db_file.read_text())
                stats = await self._import_database(db, db_data, merge)

            # Restore ChromaDB
            if restore_chromadb:
                chromadb_backup = temp_dir / "chromadb"
                if chromadb_backup.exists():
                    if not merge:
                        # Clear existing ChromaDB
                        if settings.CHROMADB_DIR.exists():
                            shutil.rmtree(settings.CHROMADB_DIR)
                    shutil.copytree(
                        chromadb_backup,
                        settings.CHROMADB_DIR,
                        dirs_exist_ok=True
                    )

            # Restore documents
            if restore_documents:
                docs_backup = temp_dir / "documents"
                if docs_backup.exists():
                    shutil.copytree(
                        docs_backup,
                        settings.DOCUMENTS_DIR,
                        dirs_exist_ok=True
                    )

            return {
                "success": True,
                "stats": stats,
                "backup_metadata": metadata
            }

        finally:
            # Cleanup temp directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    async def _import_database(
        self,
        db: AsyncSession,
        data: Dict[str, Any],
        merge: bool
    ) -> Dict[str, int]:
        """Import database data from JSON"""
        stats = {
            "sessions": 0,
            "messages": 0,
            "documents": 0,
            "memories": 0,
            "projects": 0
        }

        # Import sessions
        for s_data in data.get("sessions", []):
            existing = await db.get(ChatSession, s_data["id"])
            if existing and not merge:
                await db.delete(existing)
            if not existing or not merge:
                session = ChatSession(
                    id=s_data["id"],
                    title=s_data["title"],
                    is_archived=s_data.get("is_archived", False)
                )
                db.add(session)
                stats["sessions"] += 1

        await db.commit()

        # Import messages
        for m_data in data.get("messages", []):
            existing = await db.get(Message, m_data["id"])
            if not existing:
                message = Message(
                    id=m_data["id"],
                    session_id=m_data["session_id"],
                    role=m_data["role"],
                    content=m_data["content"],
                    model_used=m_data.get("model_used"),
                    task_type=m_data.get("task_type"),
                    routing_reason=m_data.get("routing_reason"),
                    documents_used=m_data.get("documents_used", [])
                )
                db.add(message)
                stats["messages"] += 1

        await db.commit()

        # Import memories
        for m_data in data.get("memories", []):
            existing = await db.get(Memory, m_data["id"])
            if not existing:
                from .schemas import MemoryType
                memory = Memory(
                    id=m_data["id"],
                    content=m_data["content"],
                    memory_type=MemoryType(m_data["memory_type"]) if m_data.get("memory_type") else MemoryType.FACT,
                    category=m_data.get("category"),
                    source=m_data.get("source"),
                    confidence=m_data.get("confidence", 1.0),
                    is_deleted=m_data.get("is_deleted", False)
                )
                db.add(memory)
                stats["memories"] += 1

        await db.commit()

        return stats

    def list_backups(self) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []
        for backup_file in self.backup_dir.glob("nexus_backup_*.zip*"):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "path": str(backup_file),
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "encrypted": backup_file.suffix == ".encrypted"
            })
        return sorted(backups, key=lambda x: x["created_at"], reverse=True)

    def delete_backup(self, backup_name: str) -> bool:
        """Delete a backup file"""
        backup_path = self.backup_dir / backup_name
        if backup_path.exists() and backup_path.parent == self.backup_dir:
            backup_path.unlink()
            return True
        return False

    async def schedule_auto_backup(
        self,
        db: AsyncSession,
        interval_hours: int = 24
    ):
        """Schedule automatic backups"""
        while True:
            try:
                await self.create_full_backup(db)
                # Keep only last 7 backups
                backups = self.list_backups()
                for old_backup in backups[7:]:
                    self.delete_backup(old_backup["filename"])
            except Exception as e:
                print(f"Auto backup failed: {e}")

            await asyncio.sleep(interval_hours * 3600)


# Singleton instance
backup_service = BackupService()
