from pydantic import BaseModel
from datetime import date, datetime
from typing import Any
from app.shared.models.document import DocumentStatus


class DocumentOut(BaseModel):
    id: str
    entity_id: str
    filename: str
    mime_type: str | None
    doc_type: str | None
    status: DocumentStatus
    expires_at: date | None
    ai_extracted_data: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus
