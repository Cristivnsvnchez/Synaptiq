from fastapi import APIRouter
from app.schemas.category import Category

router = APIRouter(prefix="/categories", tags=["Categories"])

fake_db: list[Category] = []


@router.get("/", response_model=list[Category])
def get_categories():
    """Return all categories."""
    return fake_db


@router.post("/", response_model=Category, status_code=201)
def create_category(category: Category):
    """Create a new category."""
    fake_db.append(category)
    return category
