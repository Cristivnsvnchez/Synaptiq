from __future__ import annotations
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class Entity(Base, TimestampMixin):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    domain_id: Mapped[str] = mapped_column(String, ForeignKey("domains.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    domain: Mapped["Domain"] = relationship(back_populates="entities")
    documents: Mapped[List["Document"]] = relationship(back_populates="entity")
    accesses: Mapped[List["Access"]] = relationship(back_populates="entity")
    reminders: Mapped[List["Reminder"]] = relationship(back_populates="entity")
