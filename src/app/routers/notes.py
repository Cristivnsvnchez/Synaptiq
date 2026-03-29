from fastapi import APIRouter
from app.schemas.note import NoteInput, NoteStructured
from datetime import datetime

router = APIRouter(prefix="/notes", tags=["Notes"])

db: list[NoteStructured] = []


@router.get("/", response_model=list[NoteStructured])
def get_notes(topic: str | None = None):
    """Return all notes, optionally filtered by topic."""
    if topic:
        return [n for n in db if n.topic.lower() == topic.lower()]
    return db


@router.post("/", response_model=NoteStructured, status_code=201)
def create_note(note: NoteInput):
    """
    Receive raw note → structure it with AI → push to Notion or OneNote.
    AI structuring and storage integration to be wired in services/.
    """
    structured = NoteStructured(
        id=len(db) + 1,
        title=f"Note on {note.topic}",
        summary="(AI summary coming soon)",
        key_concepts=[],
        raw_content=note.raw_content,
        structured_content=note.raw_content,  # placeholder until AI wired
        topic=note.topic,
        path_id=note.path_id,
        storage="notion",
        storage_url=None,
        created_at=datetime.utcnow(),
    )
    db.append(structured)
    return structured
