import asyncio
import httpx
import sys

BASE_URL = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0, follow_redirects=True) as client:
        print(f"Checking {BASE_URL}...")
        
        # 1. Health
        try:
            resp = await client.get("/health")
            resp.raise_for_status()
            print("✅ /health OK")
        except Exception as e:
            print(f"❌ /health FAILED: {e}")
            sys.exit(1)

        # 2. List Recipes (Public)
        try:
            resp = await client.get("/recipes")
            resp.raise_for_status()
            data = resp.json()
            print(f"✅ /recipes OK (Found {len(data.get('data', []))} recipes)")
        except Exception as e:
            print(f"❌ /recipes FAILED: {e}")

        # 3. Search Recipes
        try:
            resp = await client.get("/recipes", params={"q": "pasta"})
            resp.raise_for_status()
            print("✅ /recipes?q=pasta OK")
        except Exception as e:
            print(f"❌ /recipes search FAILED: {e}")

        # 4. Auth Me (Should be 401)
        resp = await client.get("/auth/me")
        if resp.status_code == 401:
             print("✅ /auth/me correctly returned 401 (Unauthenticated)")
        else:
             print(f"⚠️ /auth/me returned {resp.status_code}")

if __name__ == "__main__":
    asyncio.run(main())
