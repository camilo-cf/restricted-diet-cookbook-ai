import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.db.models.recipe import Recipe
import uuid

@pytest.mark.asyncio
async def test_list_recipes_public(client: AsyncClient, db: AsyncSession):
    # Setup: Add a user first
    import uuid
    uid = uuid.uuid4()
    user = User(id=uid, email=f"public_test_{uid.hex[:6]}@example.com", hashed_password="X", full_name="X", role="user", is_active=True)
    db.add(user)
    await db.commit()

    # Setup: Add some recipes owned by this user
    r1 = Recipe(id=uuid.uuid4(), user_id=uid, title="Public 1", ingredients=["A"], instructions=["B"], dietary_tags=["V"], description="Test")
    db.add(r1)
    await db.commit()
    
    # Verify recipes are visible
    response = await client.get("/recipes")
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

@pytest.mark.asyncio
async def test_create_recipe_flow(client_with_auth: AsyncClient, db: AsyncSession):
    # 1. Create recipe
    recipe_data = {
        "title": "Test Integration Recipe",
        "ingredients": ["Ingredient A", "Ingredient B"],
        "instruction_text": "Step 1. Step 2.",
        "dietary_tags": ["vegan"]
    }
    response = await client_with_auth.post("/recipes", json=recipe_data)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["title"] == "Test Integration Recipe"
    assert "userId" in res_data
    
    # 2. Verify it's in the list
    list_res = await client_with_auth.get("/recipes")
    assert any(r["id"] == res_data["id"] for r in list_res.json()["data"])

@pytest.mark.asyncio
async def test_recipe_rbac(client: AsyncClient, db: AsyncSession):
    # Setup: Create a recipe owned by user1
    user1 = {"username": "rbac_owner@example.com", "password": "password123"}
    await client.post("/auth/register", json=user1)
    login_res = await client.post("/auth/login", json=user1)
    if sid := login_res.cookies.get("session_id"):
        client.cookies.set("session_id", sid)
    
    recipe_data = {
        "title": "RBAC Test Recipe",
        "ingredients": ["test"],
        "instruction_text": "test",
        "dietary_tags": ["vegan"]
    }
    create_res = await client.post("/recipes", json=recipe_data)
    recipe_id = create_res.json()["id"]

    # 1. Owner can update
    update_data = {**recipe_data, "title": "Updated by Owner"}
    patch_res = await client.patch(f"/recipes/{recipe_id}", json=update_data)
    assert patch_res.status_code == 200

    # 2. Logout and Anonymous cannot update
    await client.post("/auth/logout")
    client.cookies.delete("session_id")
    patch_anon = await client.patch(f"/recipes/{recipe_id}", json=update_data)
    assert patch_anon.status_code == 401

    # 3. Another user cannot update/delete
    user2_email = f"rbac_other_{uuid.uuid4().hex[:6]}@example.com"
    user2 = {"username": user2_email, "password": "password123"}
    await client.post("/auth/register", json=user2)
    reg_other = await client.post("/auth/login", json=user2)
    assert reg_other.status_code == 200
    if sid := reg_other.cookies.get("session_id"):
        client.cookies.set("session_id", sid)
    
    patch_other = await client.patch(f"/recipes/{recipe_id}", json=update_data)
    assert patch_other.status_code == 403
    
    del_other = await client.delete(f"/recipes/{recipe_id}")
    assert del_other.status_code == 403

    # 5. Delete as maintainer
    user3_email = f"maintainer_{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/auth/register", json={"username": user3_email, "password": "password123"})
    res3 = await db.execute(select(User).where(User.email == user3_email))
    maintainer_user = res3.scalars().first()
    maintainer_user.role = "maintainer"
    await db.commit()
    
    # Login as maintainer
    maint_login = await client.post("/auth/login", json={"username": user3_email, "password": "password123"})
    if sid := maint_login.cookies.get("session_id"):
        client.cookies.set("session_id", sid)
    
    # Re-create a recipe to delete
    recipe_res = await client.post("/recipes", json=recipe_data)
    recipe_id = recipe_res.json()["id"]
    
    del_maint = await client.delete(f"/recipes/{recipe_id}")
    assert del_maint.status_code == 204

@pytest.mark.asyncio
async def test_recipe_deletion_rbac_forbidden(client: AsyncClient, db: AsyncSession):
    # Setup: Create User 1 (Owner) and User 2 (Attacker)
    u1_email = f"owner_{uuid.uuid4().hex[:6]}@example.com"
    u2_email = f"attacker_{uuid.uuid4().hex[:6]}@example.com"
    
    await client.post("/auth/register", json={"username": u1_email, "password": "password123"})
    await client.post("/auth/register", json={"username": u2_email, "password": "password123"})
    
    # Login as User 1 to create recipe
    u1_login = await client.post("/auth/login", json={"username": u1_email, "password": "password123"})
    if sid := u1_login.cookies.get("session_id"):
        client.cookies.set("session_id", sid)
    res = await client.post("/recipes", json={"title": "My Secret Recipe", "ingredients": ["apple"], "instruction_text": "eat it", "dietary_tags": []})
    recipe_id = res.json()["id"]
    await client.post("/auth/logout")
    client.cookies.delete("session_id")
    
    # Login as User 2 and try to delete User 1's recipe
    u2_login = await client.post("/auth/login", json={"username": u2_email, "password": "password123"})
    if sid := u2_login.cookies.get("session_id"):
        client.cookies.set("session_id", sid)
    res_del = await client.delete(f"/recipes/{recipe_id}")
    assert res_del.status_code == 403 # Forbidden
    
    # Verify recipe still exists
    res_get = await client.get(f"/recipes/{recipe_id}")
    assert res_get.status_code == 200

@pytest.mark.asyncio
async def test_recipe_validation(client_with_auth: AsyncClient):
    # Test missing fields
    bad_data = {"title": "No ingredients"}
    res = await client_with_auth.post("/recipes", json=bad_data)
    assert res.status_code == 422 # Pydantic error
    
    # Test unauthorized create
    await client_with_auth.post("/auth/logout")
    client_with_auth.cookies.delete("session_id")
    res_anon = await client_with_auth.post("/recipes", json={"title": "test", "ingredients": [], "instruction_text": "test", "dietary_tags": []})
    assert res_anon.status_code == 401
