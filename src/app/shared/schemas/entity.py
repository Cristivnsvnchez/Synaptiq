from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Any, Optional


class EntityCreate(BaseModel):
    domain_id: str
    name: str
    type: str
    metadata_: Optional[dict[str, Any]] = None
    notes: Optional[str] = None


class EntityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    metadata_: Optional[dict[str, Any]] = None
    notes: Optional[str] = None


class EntityOut(BaseModel):
    id: str
    domain_id: str
    name: str
    type: str
    metadata_: Optional[dict[str, Any]]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
