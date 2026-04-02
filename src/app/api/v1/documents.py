from __future__ import annotations
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.shared.models.document import Document, DocumentStatus
from app.shared.schemas.document import DocumentOut, DocumentStatusUpdate
from app.services.document_service import create_expiry_reminders, sync_expired_documents

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    entity_id: str = Form(...),
    doc_type: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    storage_dir = os.path.join(settings.storage_path, entity_id)
    os.makedirs(storage_dir, exist_ok=True)
    filepath = os.path.join(storage_dir, file.filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    from datetime import date
    exp = date.fromisoformat(expires_at) if expires_at else None

    # Determine initial status based on expiry
    status = DocumentStatus.valid
    if exp and exp < date.today():
        status = DocumentStatus.expired

    doc = Document(
        entity_id=entity_id,
        filename=file.filename,
        filepath=filepath,
        mime_type=file.content_type,
        doc_type=doc_type,
        expires_at=exp,
        status=status,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Auto-create expiry reminders
    await create_expiry_reminders(db, doc)

    return doc


@router.get("/", response_model=List[DocumentOut])
async def list_documents(
    entity_id: Optional[str] = None,
    status: Optional[DocumentStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    # Sync expired docs on read
    await sync_expired_documents(db)

    q = select(Document)
    if entity_id:
        q = q.where(Document.entity_id == entity_id)
    if status:
        q = q.where(Document.status == status)
    result = await db.execute(q.order_by(Document.expires_at.asc().nullslast()))
    return result.scalars().all()


@router.get("/expiring", response_model=List[DocumentOut])
async def list_expiring_documents(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Documents expiring within the next N days (default 30)."""
    from datetime import date, timedelta
    today = date.today()
    limit = today + timedelta(days=days)

    await sync_expired_documents(db)

    result = await db.execute(
        select(Document)
        .where(
            Document.expires_at <= limit,
            Document.expires_at >= today,
            Document.status != DocumentStatus.archived,
        )
        .order_by(Document.expires_at)
    )
    return result.scalars().all()


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/download")
async def download_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc or not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(doc.filepath, filename=doc.filename)


@router.patch("/{doc_id}/status", response_model=DocumentOut)
async def update_document_status(
    doc_id: str, payload: DocumentStatusUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = payload.status
    await db.commit()
    await db.refresh(doc)
    return doc
