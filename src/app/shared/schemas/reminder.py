from __future__ import annotations
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.shared.models.reminder import ReminderType, ReminderStatus


class ReminderCreate(BaseModel):
    entity_id: str
    document_id: Optional[str] = None
    title: str
    trigger_date: date
    type: ReminderType = ReminderType.custom
    recurrence: Optional[str] = None


class ReminderOut(BaseModel):
    id: str
    entity_id: str
    document_id: Optional[str]
    title: str
    trigger_date: date
    type: ReminderType
    status: ReminderStatus
    recurrence: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
