from pydantic import BaseModel
from datetime import datetime


class DomainOut(BaseModel):
    id: str
    slug: str
    label: str
    icon: str
    health_score: int
    created_at: datetime

    model_config = {"from_attributes": True}
