from __future__ import annotations
import os
import shutil
from typing import Any, Dict, Optional
from datetime import date

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.ai.capture import process_capture
from app.shared.models.domain import Domain
from app.shared.models.entity import Entity
from app.shared.models.document import Document, DocumentStatus
from app.services.document_service import create_expiry_reminders

router = APIRouter(prefix="/capture", tags=["AI Capture"])


class CaptureResult(BaseModel):
    suggested_domain: str
    suggested_entity_type: str
    suggested_name: str
    extracted_data: Dict[str, Any]
    expires_at: Optional[str]
    confidence: float
    # Set if auto_create=True
    entity_id: Optional[str] = None
    document_id: Optional[str] = None


@router.post("/url", response_model=CaptureResult)
async def capture_from_url(
    url: str = Form(...),
    auto_create: bool = Form(False),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a URL with Claude and extract structured data.
    If auto_create=True, automatically creates the entity in the right domain.
    """
    result = await process_capture(url=url)
    if auto_create:
        entity_id, document_id = await _create_from_result(result, db=db)
        result["entity_id"] = entity_id
        result["document_id"] = document_id
    return result


@router.post("/file", response_model=CaptureResult)
async def capture_from_file(
    file: UploadFile = File(...),
    auto_create: bool = Form(False),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a file with Claude and extract structured data.
    If auto_create=True, automatically saves the file and creates the entity.
    """
    content = await file.read()
    result = await process_capture(
        file_content=content,
        filename=file.filename,
        mime_type=file.content_type,
    )

    if auto_create:
        entity_id, document_id = await _create_from_result(
            result,
            db=db,
            file_content=content,
            filename=file.filename,
            mime_type=file.content_type,
        )
        result["entity_id"] = entity_id
        result["document_id"] = document_id

    return result


async def _create_from_result(
    result: Dict[str, Any],
    db: AsyncSession,
    file_content: Optional[bytes] = None,
    filename: Optional[str] = None,
    mime_type: Optional[str] = None,
) -> tuple[str, Optional[str]]:
    """Create entity (and optionally document) from AI extraction result."""
    # Find domain
    domain_result = await db.execute(
        select(Domain).where(Domain.slug == result["suggested_domain"])
    )
    domain = domain_result.scalar_one_or_none()
    if not domain:
        raise HTTPException(status_code=400, detail=f"Unknown domain: {result['suggested_domain']}")

    # For learning domain, promote extracted learning fields to top-level metadata
    metadata = result.get("extracted_data", {}) or {}
    if result["suggested_domain"] == "learning":
        # Ensure learning-specific fields are at the top level of metadata
        for field in ("vendor", "type", "certification_name", "exam_code", "cert_status", "official_url", "sandbox_url"):
            if field in metadata:
                pass  # already there
        # If type not set, derive from entity type
        if "type" not in metadata:
            etype = result.get("suggested_entity_type", "")
            if etype in ("certification", "certification_prep"):
                metadata["type"] = "certification_prep"
            elif etype in ("sandbox", "labs"):
                metadata["type"] = "sandbox"
            else:
                metadata["type"] = "notes_techniques"
        if "vendor" not in metadata:
            metadata["vendor"] = "Autre"

    # Create entity
    entity = Entity(
        domain_id=domain.id,
        name=result["suggested_name"],
        type=result["suggested_entity_type"],
        metadata_=metadata,
        notes=result.get("notes"),
    )
    db.add(entity)
    await db.commit()
    await db.refresh(entity)

    document_id = None

    # Save file if provided
    if file_content and filename:
        storage_dir = os.path.join(settings.storage_path, entity.id)
        os.makedirs(storage_dir, exist_ok=True)
        filepath = os.path.join(storage_dir, filename)
        with open(filepath, "wb") as f:
            f.write(file_content)

        expires_at = None
        if result.get("expires_at"):
            try:
                expires_at = date.fromisoformat(result["expires_at"])
            except ValueError:
                pass

        status = DocumentStatus.valid
        if expires_at and expires_at < date.today():
            status = DocumentStatus.expired

        doc = Document(
            entity_id=entity.id,
            filename=filename,
            filepath=filepath,
            mime_type=mime_type,
            ai_extracted_data=result.get("extracted_data"),
            expires_at=expires_at,
            status=status,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        await create_expiry_reminders(db, doc)
        document_id = doc.id

    return entity.id, document_id
