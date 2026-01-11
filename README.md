# Restricted Diet Cookbook AI 🧑‍🍳🥦

> **An AI-powered recipe generator that respects your dietary restrictions.**
> *Production-Ready Monorepo | Contract-First API | AI Reliability Guards*

---

## 🎯 Problem & Solution
### The Problem
Cooking with dietary restrictions is a mental minefield. Whether it's **Celiac disease (Gluten-free)**, **Type 2 Diabetes (Sugar-free)**, or lifestyle choices like **Keto** or **Veganism**, the friction of finding safe recipes is immense. Users often find themselves:
- Settling for generic, bland meals that "tick the boxes" but lack culinary soul.
- Spending excessive time manually scouring ingredient lists for "hidden" violations (e.g., soy sauce containing gluten).
- Staring at a random assortment of fridge ingredients without a clear, safe path to a meal.

### The Solution: Cookbook AI
**Cookbook AI** leverages Advanced Agentic AI to transform this experience into a safe, creative, and efficient workflow:
1.  **Visual Intelligence**: Snap a photo of your available ingredients. The system identifies them and uses them as the base for your meal.
2.  **Safety-First Validation**: Our AI performs a "double-check" against your specific restrictions, flagging hidden allergens and proposing safe, gourmet substitutions.
3.  **Michelin-Star Logic**: Unlike generic chatbots, our system is tuned with a chef-centric persona to ensure flavors are balanced, techniques are professional, and results are delicious.
4.  **Gallery of Success**: Users can build a personal repository of verified safe recipes, complete with photos of their own successful dishes.

**Live Demo**: [https://cookbook-frontend-k5lz.onrender.com](https://cookbook-frontend-k5lz.onrender.com)

### 📸 Screenshots

| Landing Page | Recipe Explorer | Detailed Recipe |
| :---: | :---: | :---: |
| ![Home](docs/img/1_home.png) | ![Browser](docs/img/2_browser.png) | ![Recipe](docs/img/3_recipe.png) |

---

## 🏗️ Architecture

```mermaid
graph TD
    User[User Browser] -->|HTTPS| Frontend[Next.js Frontend]
    Frontend -->|Typed Fetcher| Backend[FastAPI Backend]
    
    subgraph "Infrastructure"
        Backend -->|Async/Pool| DB[(PostgreSQL)]
        Backend -->|S3 Protocol| MinIO[(MinIO/Storage)]
    end
    
    subgraph "AI Core"
        Backend -->|Circuit Breaker| OpenAI[OpenAI API]
        Backend -->|Cost Guard| OpenAI
    end

    classDef production fill:#d4fae3,stroke:#2e7d32,stroke-width:2px;
    class Frontend,Backend,DB,MinIO production;
```

## 🛠️ Tech Stack & System Architecture

Cookbook AI is built with a modern, high-performance stack designed for modularity and scalability:

-   **Frontend (`apps/web`)**: ⚛️ **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Shadcn UI**. It manages the stateful recipe generation "Wizard", leverages React Server Components where beneficial, and communicates with the backend via a generated, typesafe API client.
-   **Backend (`apps/api`)**: ⚡ **FastAPI (Python)**. A high-performance, asynchronous REST API. It orchestrates AI recipe generation using **GPT-4o**, enforces **RBAC** (Admin, Maintainer, User roles), and manages secure session authentication with `HttpOnly` cookies.
-   **API Contract (`packages/api-client`)**: 📜 **OpenAPI 3.1**. We use a code-generation approach to create a shared TypeScript library, ensuring the frontend is always in sync with backend schema changes.
-   **Database Layer**: 🏛️ **SQLAlchemy 2.0 (ORM)** with **PostgreSQL** in production/Docker settings and **SQLite** for extremely fast, isolated unit and integration tests.
-   **Object Storage**: 📦 **MinIO (S3-Compatible)** for local development and Cloudflare R2 / AWS S3 for production. Handles ingredient identification photos and user dish uploads.
-   **Containerization & DevOps**: 🐋 **Docker** and **Docker Compose** for environment parity. **GitHub Actions** handles CI/CD (Lints, Type Checks, Vitest/Pytest execution).

---

## 🏛️ Database Integration

The database layer is engineered for consistency and flexibility across different environments:

1.  **Multi-Database Support**:
    -   **Production/Development**: Uses **PostgreSQL** (via `asyncpg`) to support robust JSONB operations for dietary tags and complex relational queries.
    -   **Automated Testing**: Uses **SQLite** (via **aiosqlite**) with an in-memory database strategy (`sqlite:///:memory:`). This ensures that every test run starts with a fresh, isolated schema, significantly speeding up the CI pipeline.
2.  **Schema Management**: **Alembic** handles version-controlled migrations, ensuring that local database schemas can be safely evolved alongside the application code.
3.  **ORM Pattern**: We utilize **SQLAlchemy’s Mapping System** to ensure that business logic remains independent of the underlying database engine. All JSON lists (Ingredients, Instructions) are automatically handled as native types in both Postgres and SQLite.

---

## 🛡️ Contract Enforcement (Rubric: Best Practices)
We strictly enforce the API contract between Frontend and Backend to prevent "drift breakdown".

1.  **Single Source of Truth**: `openapi.yaml` at the root defines the schema.
2.  **Auto-Generation**: `pnpm gen:client` generates a fully typed TypeScript client (`openapi-fetch`) in `packages/api-client`.
    *   *Result*: Frontend compilation FAILS if the API spec changes without updating client usage.
3.  **Freshness Check**: CI runs `pnpm client:check` to ensure the generated code matches the current `openapi.yaml`.

---

## 🤖 AI Safety & Reliability (Rubric: AI Engineering)
This is not just a wrapper; it's an engineered AI service. See [prompts/AGENT_SYSTEM_PROMPTS.md](prompts/AGENT_SYSTEM_PROMPTS.md) for details on the agents used to build this.

1.  **Structured Output**: Uses Pydantic models to force strict JSON output from OpenAI (Ingredients, Instructions, Nutrition).
2.  **Failsafes**:
    *   **Circuit Breaker**: `tenacity` retry logic with exponential backoff for API timeouts.
    *   **Cost Guard**: Logic limits token usage/request frequency per user (simulated).
    *   **Mock Fallback**: If OpenAI is down (or key missing), the system gracefully degrades to a mock recipe generator for testing.

---

## ✅ Testing Strategy
*   **Unit Tests**: `vitest` for Frontend components, `pytest` for Backend logic.
*   **Integration Tests**: Backend tests spin up a real test DB (via `pytest-asyncio` and `testcontainers` strategy) to verify SQL constraints.
*   **E2E Tests**: Playwright (`apps/web/e2e`) runs the full "Wizard Flow" inside Docker container, validating the critical path from "Landing" to "Recipe Result".
*   **Coverage**: Target >60% (Configured in `vitest.config.ts` and `pyproject.toml`).

---

## 🚀 Local Development (Fresh Clone Guide)

**Prerequisites**: Docker Desktop, Node.js 20+, Pnpm.

### 1. Simple Setup (Docker Compose)
The easiest way to run the entire system is using the provided `run.sh` script, which wraps Docker Compose for a seamless experience.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/restricted-diet-cookbook-ai.git
    cd restricted-diet-cookbook-ai
    ```

2.  **Initialize & Start**
    ```bash
    ./run.sh dev
    ```
    *   Frontend: `http://localhost:3000`
    *   Backend Docs: `http://localhost:8000/docs`
    *   MinIO Console: `http://localhost:9001`
    This command will:
    - Build the Frontend and Backend images.
    - Start PostgreSQL, MinIO, Backend, and Frontend containers.
    - Automatically initialize the MinIO bucket storage.

3.  **Run Migrations**
    ```bash
    ./run.sh migrate
    ```

4.  **Run Tests**
    ```bash
    ./run.sh test    # Runs Pytest (Backend) and Vitest (Frontend)
    ```

### 2. Manual Docker Control
If you prefer using standard Docker commands:
```bash
# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# View logs
docker compose logs -f
```

### 3. Access URLs
-   **Frontend**: `http://localhost:3000`
-   **Backend API API Docs**: `http://localhost:8000/docs`
-   **MinIO Storage Dashboard**: `http://localhost:9001` (User/Pass: `minioadmin`/`minioadmin`)

### 4. Verification Commands
```bash
./run.sh test    # Runs Pytest (Backend) and Vitest (Frontend)
./run.sh check   # Full check: Linting, Types, API Client Freshness
```

---

## 🛳️ Production Deployment

For detailed production setup instructions, including environment optimization, storage endpoint handling, and scaling, see the [DEPLOYMENT.md](DEPLOYMENT.md) guide.

### Quick Start (Render)
1. Ensure your repository has the provided `render.yaml`.
2. Deploy via Render Blueprint.
3. Manually add `OPENAI_API_KEY` to the `cookbook-backend` service.

### New Features (v1.1)
- **User Management**: Registration, profile customization, and dietary preferences.
- **Show Your Dish**: Capability to upload photos of final cooked meals.
- **Enhanced Storage**: Robust S3 signature handling for public access.

### 3. CI/CD Pipeline
The repository includes GitHub Actions for:
* **Linting & Type Checking**: On every pull request.
* **Test Suite Execution**: Ensures no regressions before merge.
* **OpenAPI Client Check**: Validates that the frontend client is in sync with the backend.

---

## ☁️ Deployment (Render)

## 🔧 Troubleshooting

### Upload Fails (403 Forbidden)
*   **Cause**: Docker time drift causing S3 signature skew.
*   **Fix**: Restart Docker Desktop or sync system time.

### AI Generation Timeout
*   **Cause**: OpenAI latency spikes.
*   **Fix**: The built-in "Mock Mode" will auto-engage after 3 retries. Check backend logs for `[FallbackActivated]` message.

### "Client out of date" Error
*   **Cause**: Changed `openapi.yaml` but didn't regen client.
*   **Fix**: Run `./run.sh gen:client`.

---

## 📋 Rubric Evidence (Reviewer Checklist)

This section maps project components to the [Course Rubric](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/project/README.md) (excluding AI Output Evaluation).

| Criterion | Evidence / Path | Verification Command |
| :--- | :--- | :--- |
| **1. Problem Definition** | [README.md](#🎯-problem--solution) | N/A (Doc Review) |
| **2. AI Core Logic** | [AGENTS.md](AGENTS.md) | View [Prompts & MCP](AGENTS.md#-model-context-protocol-mcp) |
| **3. API Contract** | [openapi.yaml](openapi.yaml) | `pnpm client:check` |
| **4. Backend Tests** | [VERIFICATION.md](docs/VERIFICATION.md#3-test-coverage) | `./run.sh test` (Pytest) |
| **5. Frontend Tests** | [VERIFICATION.md](docs/VERIFICATION.md#3-test-coverage) | `./run.sh test` (Vitest) |
| **6. Integration Tests** | [INTEGRATION_TESTS.md](docs/INTEGRATION_TESTS.md) | `pnpm --filter frontend e2e` |
| **7. Reproducibility** | [README.md](#🚀-local-development-fresh-clone-guide) | `./run.sh dev` |
| **8. Deployment** | [render.yaml](render.yaml) | [Live URL](#-live-demo) |

---

## 🏛️ ADRs (Architecture Decision Records)
We document key architectural decisions to ensure long-term maintainability.
- **[ADR 0001: Contract-First OpenAPI](docs/adr/0001-contract-first-openapi.md)**: Ensuring type safety between Frontend and Backend.
- **[ADR 0002: Multi-Backend Storage](docs/adr/0002-storage-strategy.md)**: Handling local dev vs production storage.
- **[ADR 0003: Client-Side Auth Guards](docs/adr/0003-client-side-auth-guards.md)**: Stabilizing authentication on cross-domain subdomains.

---

## 🏗️ Technical Documentation
- 📘 **[Architecture](docs/ARCHITECTURE.md)**: System design and mermaid diagrams.
- 📜 **[API Contract](docs/CONTRACT.md)**: OpenAPI patterns and error handling.
- 🚀 **[Deployment](DEPLOYMENT.md)**: Production setup and Render guide.
- 🔍 **[Observability](docs/observability.md)**: Logging and monitoring practices.

---

*Built with ❤️ by Camilo C.F. (AI Tooling Lead)*
