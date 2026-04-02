from __future__ import annotations
import enum
from datetime import date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base
from app.shared.models.base import TimestampMixin, new_uuid


class ReminderType(str, enum.Enum):
    expiry = "expiry"
    deadline = "deadline"
    renewal = "renewal"
    custom = "custom"


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    dismissed = "dismissed"


class Reminder(Base, TimestampMixin):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    entity_id: Mapped[str] = mapped_column(String, ForeignKey("entities.id"), nullable=False)
    document_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("documents.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    trigger_date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[ReminderType] = mapped_column(SAEnum(ReminderType), default=ReminderType.custom)
    status: Mapped[ReminderStatus] = mapped_column(SAEnum(ReminderStatus), default=ReminderStatus.pending)
    recurrence: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    entity: Mapped["Entity"] = relationship(back_populates="reminders")
    document: Mapped["Document"] = relationship(back_populates="reminders")
