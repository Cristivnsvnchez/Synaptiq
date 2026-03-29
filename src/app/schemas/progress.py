from pydantic import BaseModel
from datetime import date


class TopicProgress(BaseModel):
    topic: str
    notes_count: int
    paths_count: int
    completed_steps: int
    total_steps: int
    last_activity: date
    mastery_level: str      # "beginner" | "intermediate" | "advanced"


class Dashboard(BaseModel):
    total_notes: int
    total_paths: int
    active_topics: list[str]
    topics_progress: list[TopicProgress]
    streak_days: int        # consecutive days with activity
    next_suggested_step: str
