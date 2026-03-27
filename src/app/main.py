from fastapi import FastAPI
from app.routers import transactions, budgets, categories

app = FastAPI(
    title="Budget Management API",
    description="API for managing budgets, transactions and categories",
    version="0.1.0",
)

app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(categories.router)


@app.get("/")
def root():
    return {"message": "Welcome to Budget Management API 💰"}
