# Budget Management API

A REST API for managing personal budgets, built with **FastAPI** and Python.

## Project Structure

```
BudgetManagement/
├── src/
│   └── app/
│       ├── main.py              # Entry point
│       ├── routers/             # Route handlers
│       │   ├── transactions.py
│       │   ├── budgets.py
│       │   └── categories.py
│       ├── models/              # Database models (future)
│       └── schemas/             # Pydantic schemas
│           ├── transaction.py
│           ├── budget.py
│           └── category.py
├── tests/
│   └── test_api.py
├── docs/
├── design/
├── infra/
├── phases/
├── scripts/
├── requirements.txt
└── .gitignore
```

## Setup

```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
cd src
uvicorn app.main:app --reload
```

## API Documentation

Once running, open:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome |
| GET/POST | `/transactions/` | List / Create transactions |
| GET/DELETE | `/transactions/{id}` | Get / Delete a transaction |
| GET/POST | `/budgets/` | List / Create budgets |
| GET/POST | `/categories/` | List / Create categories |

## Run Tests

```bash
pytest tests/
```
