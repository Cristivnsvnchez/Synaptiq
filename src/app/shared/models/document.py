from __future__ import annotations
import enum
from datetime import date
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class DocumentStatus(str, enum.Enum):
    valid = "valid"
    expired = "expired"
    pending = "pending"
    archived = "archived"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    entity_id: Mapped[str] = mapped_column(String, ForeignKey("entities.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    filepath: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[DocumentStatus] = mapped_column(SAEnum(DocumentStatus), default=DocumentStatus.valid)
    expires_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ai_extracted_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="documents")
    reminders: Mapped[List["Reminder"]] = relationship(back_populates="document")
