from pydantic import BaseModel
from datetime import datetime


class AccessCreate(BaseModel):
    entity_id: str
    label: str
    url: str | None = None
    account_ref: str | None = None
    username: str | None = None
    notes: str | None = None


class AccessOut(BaseModel):
    id: str
    entity_id: str
    label: str
    url: str | None
    account_ref: str | None
    username: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
