from pydantic import BaseModel


class Category(BaseModel):
    id: int
    name: str
    color: str | None = None  # e.g. "#FF5733"
    icon: str | None = None   # e.g. "🍔"
