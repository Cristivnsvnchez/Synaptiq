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


@router.post("/analyze-file")
async def analyze_file_upload(file: UploadFile = File(...)):
    """Analyze a file with Claude OCR/Vision and return structured fields.
    Does not store the file — used for pre-filling forms before entity creation."""
    content = await file.read()
    mime = file.content_type or ""
    filename = file.filename or ""

    from app.ai.extraction import extract_text_from_pdf
    from app.ai.structuring import call_claude, call_claude_with_image
    import json

    IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

    SYSTEM = """You are a document analysis AI. Extract all structured data from the document.
Always respond with valid JSON only, no explanation, no markdown."""

    PROMPT = """Analyze this document and extract all relevant information. Return a JSON object with:
- "name": the service/company/vendor name (string)
- "price": the subscription or invoice amount as a number (e.g. 21.78). Use the recurring amount if visible, otherwise the total.
- "billing_cycle": one of "monthly", "yearly", "weekly", "one_time" — infer from the document
- "website": the service website if visible (string or null)
- "category": one of Streaming, Logiciel, Cloud, Gaming, Musique, Presse, Fitness, Utilitaire, Autre
- "currency": currency code (e.g. "EUR", "USD")
- "fields": object with ALL other extracted data (dates, references, addresses, VAT, totals, IBAN, etc.)
- "expires_at": ISO date string if a due date or validity date is found, null otherwise
- "confidence": float 0.0 to 1.0

Respond ONLY with valid JSON."""

    try:
        if mime in IMAGE_TYPES or filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            raw = await call_claude_with_image(content, mime or "image/jpeg", PROMPT, system=SYSTEM)
        elif mime == "application/pdf" or filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(content)
            if not text:
                raise HTTPException(status_code=422, detail="Impossible d'extraire le texte du PDF")
            raw = await call_claude(f"{PROMPT}\n\nDocument:\n---\n{text[:6000]}", system=SYSTEM)
        else:
            try:
                text = content.decode("utf-8", errors="ignore")[:6000]
            except Exception:
                raise HTTPException(status_code=422, detail="Format de fichier non supporté")
            raw = await call_claude(f"{PROMPT}\n\nDocument:\n---\n{text}", system=SYSTEM)

        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        result.setdefault("name", "")
        result.setdefault("price", None)
        result.setdefault("billing_cycle", "monthly")
        result.setdefault("website", None)
        result.setdefault("category", "Autre")
        result.setdefault("currency", "EUR")
        result.setdefault("fields", {})
        result.setdefault("expires_at", None)
        result.setdefault("confidence", 0.5)
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="L'IA n'a pas retourné de JSON valide")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analyse échouée : {str(e)}")


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


@router.post("/{doc_id}/analyze")
async def analyze_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Run Claude OCR/Vision on a document and return extracted structured fields."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc or not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="Document not found")

    with open(doc.filepath, "rb") as f:
        content = f.read()

    from app.ai.extraction import extract_text_from_pdf
    from app.ai.structuring import call_claude, call_claude_with_image
    import json

    IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    mime = doc.mime_type or ""

    SYSTEM = """You are a document analysis AI. Extract all useful structured data from the document.
Always respond with valid JSON only, no explanation, no markdown."""

    PROMPT = """Analyze this document and return a JSON object with:
- "fields": object with all extracted data (amounts, dates, names, references, addresses, cycle, vendor, etc.)
  Use clear snake_case keys like: amount, currency, billing_cycle, vendor, issue_date, due_date, period, reference, total_ht, total_ttc, vat, iban
  For billing_cycle use: "monthly", "yearly", "weekly", or "one_time"
  For amounts use numeric values (not strings)
- "suggested_metadata": object with only the fields relevant to update entity metadata (e.g. price, billing_cycle, website)
- "expires_at": ISO date string if a due date or validity date is found, null otherwise
- "confidence": float 0.0 to 1.0

Respond ONLY with valid JSON."""

    try:
        if mime in IMAGE_TYPES or doc.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            raw = await call_claude_with_image(content, mime or "image/jpeg", PROMPT, system=SYSTEM)
        elif mime == "application/pdf" or doc.filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(content)
            if not text:
                raise HTTPException(status_code=422, detail="Could not extract text from PDF")
            raw = await call_claude(f"{PROMPT}\n\nDocument content:\n---\n{text[:6000]}", system=SYSTEM)
        else:
            try:
                text = content.decode("utf-8", errors="ignore")[:6000]
            except Exception:
                raise HTTPException(status_code=422, detail="Unsupported file type for analysis")
            raw = await call_claude(f"{PROMPT}\n\nDocument content:\n---\n{text}", system=SYSTEM)

        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        extracted = json.loads(raw.strip())
        extracted.setdefault("fields", {})
        extracted.setdefault("suggested_metadata", {})
        extracted.setdefault("expires_at", None)
        extracted.setdefault("confidence", 0.5)
        return extracted
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{doc_id}/preview")
async def preview_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Serve a document inline for browser preview (PDF, images)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc or not os.path.exists(doc.filepath):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        doc.filepath,
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'},
    )


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
