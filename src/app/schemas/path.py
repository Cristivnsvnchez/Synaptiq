from pydantic import BaseModel
from typing import Optional


class LearningStep(BaseModel):
    order: int
    title: str
    description: str
    resources: list[str] = []
    completed: bool = False


class LearningPath(BaseModel):
    id: int
    name: str               # e.g. "SAP Fundamentals"
    topic: str              # e.g. "SAP"
    description: Optional[str] = None
    steps: list[LearningStep] = []
    total_steps: int = 0
    completed_steps: int = 0

    @property
    def progress_pct(self) -> float:
        if self.total_steps == 0:
            return 0.0
        return round((self.completed_steps / self.total_steps) * 100, 1)
