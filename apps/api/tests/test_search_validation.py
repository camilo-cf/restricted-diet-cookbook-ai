import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.db.models.recipe import Recipe
import uuid

@pytest.mark.asyncio
async def test_search_by_ingredient(client: AsyncClient, db: AsyncSession):
    uid = uuid.uuid4()
    user = User(id=uid, email=f"search_test_{uid.hex[:6]}@example.com", hashed_password="X", full_name="X", role="user", is_active=True)
    db.add(user)
    
    r1 = Recipe(id=uuid.uuid4(), user_id=uid, title="Chicken Salad", ingredients=["chicken", "lettuce"], instructions=["Mix"], dietary_tags=["keto"], description="A healthy chicken salad")
    db.add(r1)
    await db.commit()

    # Search by ingredient
    response = await client.get("/recipes?q=chicken")
    assert response.status_code == 200
    data = response.json()["data"]
    assert any("Chicken Salad" in r["title"] for r in data)

@pytest.mark.asyncio
async def test_filter_by_dietary_tags(client: AsyncClient, db: AsyncSession):
    uid = uuid.uuid4()
    user = User(id=uid, email=f"filter_test_{uid.hex[:6]}@example.com", hashed_password="X", full_name="X", role="user", is_active=True)
    db.add(user)
    
    r1 = Recipe(id=uuid.uuid4(), user_id=uid, title="Vegan Burger", ingredients=["beans"], instructions=["Fry"], dietary_tags=["vegan"], description="Plant-based burger")
    r2 = Recipe(id=uuid.uuid4(), user_id=uid, title="Beef Steak", ingredients=["beef"], instructions=["Grill"], dietary_tags=["keto"], description="Traditional beef steak")
    db.add(r1)
    db.add(r2)
    await db.commit()

    # Filter by vegan
    response = await client.get("/recipes?dietary_tags=vegan")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 1
    assert all("vegan" in r["dietaryTags"] for r in data)
    assert not any("Beef Steak" in r["title"] for r in data)

@pytest.mark.asyncio
async def test_ai_validation_endpoint(client_with_auth: AsyncClient):
    from unittest.mock import patch
    mock_issues = [{"ingredient": "Milk", "issue": "Not vegan", "suggestion": "Almond Milk"}]
    
    with patch("app.api.routes.ai.ai_service.validate_ingredients", return_value=mock_issues):
        payload = {
            "ingredients": ["Milk", "Cheese"],
            "restrictions": ["Vegan"]
        }
        response = await client_with_auth.post("/ai/validate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "issues" in data
        assert len(data["issues"]) > 0
        assert data["issues"][0]["ingredient"] == "Milk"
