from pydantic import BaseModel
from datetime import date, datetime
from app.shared.models.reminder import ReminderType, ReminderStatus


class ReminderCreate(BaseModel):
    entity_id: str
    document_id: str | None = None
    title: str
    trigger_date: date
    type: ReminderType = ReminderType.custom
    recurrence: str | None = None


class ReminderOut(BaseModel):
    id: str
    entity_id: str
    document_id: str | None
    title: str
    trigger_date: date
    type: ReminderType
    status: ReminderStatus
    recurrence: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
