from __future__ import annotations
from pydantic import BaseModel
from datetime import date, datetime
from typing import Any, Optional
from app.shared.models.document import DocumentStatus


class DocumentOut(BaseModel):
    id: str
    entity_id: str
    filename: str
    mime_type: Optional[str]
    doc_type: Optional[str]
    status: DocumentStatus
    expires_at: Optional[date]
    ai_extracted_data: Optional[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus
