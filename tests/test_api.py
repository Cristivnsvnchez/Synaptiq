from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))

from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200


def test_create_category():
    cat = {"id": 1, "name": "Food", "color": "#FF5733", "icon": "🍔"}
    response = client.post("/categories/", json=cat)
    assert response.status_code == 201
    assert response.json()["name"] == "Food"


def test_create_transaction():
    tx = {
        "id": 1,
        "title": "Lunch",
        "amount": 12.50,
        "type": "expense",
        "category_id": 1,
        "date": "2026-03-27",
    }
    response = client.post("/transactions/", json=tx)
    assert response.status_code == 201
    assert response.json()["title"] == "Lunch"


def test_create_budget():
    budget = {"id": 1, "name": "Monthly Food", "limit": 300.0, "category_id": 1, "month": 3, "year": 2026}
    response = client.post("/budgets/", json=budget)
    assert response.status_code == 201
