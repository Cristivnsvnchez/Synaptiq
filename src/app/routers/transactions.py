from fastapi import APIRouter
from app.schemas.transaction import Transaction

router = APIRouter(prefix="/transactions", tags=["Transactions"])

fake_db: list[Transaction] = []


@router.get("/", response_model=list[Transaction])
def get_transactions():
    """Return all transactions."""
    return fake_db


@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(transaction_id: int):
    """Return a single transaction by ID."""
    for t in fake_db:
        if t.id == transaction_id:
            return t
    return {"error": "Transaction not found"}


@router.post("/", response_model=Transaction, status_code=201)
def create_transaction(transaction: Transaction):
    """Create a new transaction."""
    fake_db.append(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int):
    """Delete a transaction by ID."""
    global fake_db
    fake_db = [t for t in fake_db if t.id != transaction_id]
