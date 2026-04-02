from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Any

from app.core.database import get_db
from app.ai.capture import process_capture

router = APIRouter(prefix="/capture", tags=["AI Capture"])


class CaptureResult(BaseModel):
    suggested_domain: str
    suggested_entity_type: str
    extracted_data: dict[str, Any]
    suggested_name: str
    confidence: float


@router.post("/url", response_model=CaptureResult)
async def capture_from_url(
    url: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    result = await process_capture(url=url)
    return result


@router.post("/file", response_model=CaptureResult)
async def capture_from_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = await process_capture(file_content=content, filename=file.filename, mime_type=file.content_type)
    return result
