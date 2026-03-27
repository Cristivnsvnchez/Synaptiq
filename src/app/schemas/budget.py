from pydantic import BaseModel


class Budget(BaseModel):
    id: int
    name: str
    limit: float
    category_id: int
    month: int  # 1-12
    year: int
