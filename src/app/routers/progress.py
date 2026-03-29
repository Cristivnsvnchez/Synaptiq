from fastapi import APIRouter
from app.schemas.progress import Dashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=Dashboard)
def get_dashboard():
    """
    Return the full learning dashboard.
    Aggregates notes, paths and progress across all topics.
    """
    # Placeholder — will aggregate real data from notes + paths DBs
    return Dashboard(
        total_notes=0,
        total_paths=0,
        active_topics=[],
        topics_progress=[],
        streak_days=0,
        next_suggested_step="Start your first learning path!",
    )
