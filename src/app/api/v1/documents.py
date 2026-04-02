import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.shared.models.document import Document, DocumentStatus
from app.shared.schemas.document import DocumentOut, DocumentStatusUpdate

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    entity_id: str = Form(...),
    doc_type: str | None = Form(None),
    expires_at: str | None = Form(None),
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

    doc = Document(
        entity_id=entity_id,
        filename=file.filename,
        filepath=filepath,
        mime_type=file.content_type,
        doc_type=doc_type,
        expires_at=exp,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/", response_model=list[DocumentOut])
async def list_documents(entity_id: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Document)
    if entity_id:
        q = q.where(Document.entity_id == entity_id)
    result = await db.execute(q)
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
