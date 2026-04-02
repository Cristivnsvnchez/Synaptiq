from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AccessCreate(BaseModel):
    entity_id: str
    label: str
    url: Optional[str] = None
    account_ref: Optional[str] = None
    username: Optional[str] = None
    notes: Optional[str] = None


class AccessOut(BaseModel):
    id: str
    entity_id: str
    label: str
    url: Optional[str]
    account_ref: Optional[str]
    username: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
