from pydantic import BaseModel
from datetime import datetime
from typing import Any


class EntityCreate(BaseModel):
    domain_id: str
    name: str
    type: str
    metadata_: dict[str, Any] | None = None
    notes: str | None = None


class EntityUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    metadata_: dict[str, Any] | None = None
    notes: str | None = None


class EntityOut(BaseModel):
    id: str
    domain_id: str
    name: str
    type: str
    metadata_: dict[str, Any] | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
