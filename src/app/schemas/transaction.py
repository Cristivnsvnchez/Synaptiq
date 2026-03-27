from pydantic import BaseModel
from datetime import date
from enum import Enum


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class Transaction(BaseModel):
    id: int
    title: str
    amount: float
    type: TransactionType
    category_id: int
    date: date
    note: str | None = None
