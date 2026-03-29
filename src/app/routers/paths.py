from fastapi import APIRouter
from app.schemas.path import LearningPath, LearningStep

router = APIRouter(prefix="/paths", tags=["Learning Paths"])

db: list[LearningPath] = []


@router.get("/", response_model=list[LearningPath])
def get_paths():
    """Return all learning paths."""
    return db


@router.get("/{path_id}", response_model=LearningPath)
def get_path(path_id: int):
    """Return a single learning path."""
    for p in db:
        if p.id == path_id:
            return p
    return {"error": "Path not found"}


@router.post("/", response_model=LearningPath, status_code=201)
def create_path(path: LearningPath):
    """Create a new learning path."""
    path.total_steps = len(path.steps)
    db.append(path)
    return path


@router.patch("/{path_id}/steps/{step_order}/complete", response_model=LearningPath)
def complete_step(path_id: int, step_order: int):
    """Mark a step as completed and update progress."""
    for path in db:
        if path.id == path_id:
            for step in path.steps:
                if step.order == step_order and not step.completed:
                    step.completed = True
                    path.completed_steps += 1
            return path
    return {"error": "Path or step not found"}
