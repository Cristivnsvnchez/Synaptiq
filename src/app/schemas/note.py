from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoteInput(BaseModel):
    """Raw note as typed by the user — unformatted."""
    raw_content: str
    topic: str          # e.g. "SAP", "Power Platform"
    path_id: Optional[int] = None


class NoteStructured(BaseModel):
    """AI-structured version of the note, ready to push to Notion/OneNote."""
    id: int
    title: str
    summary: str
    key_concepts: list[str]
    raw_content: str
    structured_content: str   # Markdown formatted
    topic: str
    path_id: Optional[int] = None
    storage: str              # "notion" or "onenote"
    storage_url: Optional[str] = None
    created_at: datetime
