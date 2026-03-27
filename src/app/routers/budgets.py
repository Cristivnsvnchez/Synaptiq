from fastapi import APIRouter
from app.schemas.budget import Budget

router = APIRouter(prefix="/budgets", tags=["Budgets"])

fake_db: list[Budget] = []


@router.get("/", response_model=list[Budget])
def get_budgets():
    """Return all budgets."""
    return fake_db


@router.post("/", response_model=Budget, status_code=201)
def create_budget(budget: Budget):
    """Create a new budget."""
    fake_db.append(budget)
    return budget
