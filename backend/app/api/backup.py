"""Backup and restore API endpoints"""
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..services.backup_service import backup_service

router = APIRouter(prefix="/backup", tags=["backup"])


@router.post("/create")
async def create_backup(
    include_documents: bool = True,
    include_chromadb: bool = True,
    encrypt: bool = False,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Create a full backup of all data"""
    try:
        backup_path = await backup_service.create_full_backup(
            db=db,
            include_documents=include_documents,
            include_chromadb=include_chromadb,
            encrypt=encrypt
        )
        return {
            "success": True,
            "filename": backup_path.name,
            "path": str(backup_path),
            "size_bytes": backup_path.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.get("/list")
async def list_backups() -> List[dict]:
    """List available backups"""
    return backup_service.list_backups()


@router.get("/download/{filename}")
async def download_backup(filename: str) -> FileResponse:
    """Download a backup file"""
    backup_path = backup_service.backup_dir / filename
    if not backup_path.exists() or backup_path.parent != backup_service.backup_dir:
        raise HTTPException(status_code=404, detail="Backup not found")

    return FileResponse(
        path=backup_path,
        filename=filename,
        media_type="application/zip"
    )


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    restore_documents: bool = True,
    restore_chromadb: bool = True,
    merge: bool = False,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Restore data from an uploaded backup file"""
    try:
        # Save uploaded file temporarily
        temp_path = backup_service.backup_dir / f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Restore from backup
        result = await backup_service.restore_backup(
            db=db,
            backup_path=temp_path,
            restore_documents=restore_documents,
            restore_chromadb=restore_chromadb,
            merge=merge
        )

        # Clean up temp file
        temp_path.unlink()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.post("/restore/{filename}")
async def restore_existing_backup(
    filename: str,
    restore_documents: bool = True,
    restore_chromadb: bool = True,
    merge: bool = False,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Restore data from an existing backup file"""
    backup_path = backup_service.backup_dir / filename
    if not backup_path.exists() or backup_path.parent != backup_service.backup_dir:
        raise HTTPException(status_code=404, detail="Backup not found")

    try:
        result = await backup_service.restore_backup(
            db=db,
            backup_path=backup_path,
            restore_documents=restore_documents,
            restore_chromadb=restore_chromadb,
            merge=merge
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.delete("/{filename}")
async def delete_backup(filename: str) -> dict:
    """Delete a backup file"""
    if backup_service.delete_backup(filename):
        return {"success": True, "deleted": filename}
    raise HTTPException(status_code=404, detail="Backup not found")
