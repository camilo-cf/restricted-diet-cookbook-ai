# Integration Testing Strategy 🧪

This project maintains a clear separation between **Unit Tests** (logic-only) and **Integration Tests** (complex workflows with DB/Storage).

## 1. Backend Integration Tests (`apps/api/tests`)

Our integration tests verify the interplay between the FastAPI routes, the SQLAlchemy ORM, and the actual Postgres/SQLite database.

### Key Workflows Tested:
- **Authentication Lifecycle**: 
  - `test_auth.py`: Registration -> Login -> Session Persistence -> Logout.
  - Verifies cookie setting (`httpOnly`, `SameSite`) and passlib hashing.
- **Recipe Management (RBAC)**:
  - `test_recipes.py`: Creation of recipes, listing with dietary filters, and ownership validation (only authors can delete).
- **File Upload Workflow**:
  - `test_uploads.py`: Presigning S3 URLs, confirming uploads, and verifying local disk storage fallback.

### Environmental Support:
- **Test DB**: We use `pytest-asyncio` with a transient SQLite database for rapid local testing.
- **Production-Ready**: The suite is compatible with a real Postgres instance via the `DATABASE_URL` override in CI.

---

## 2. Frontend E2E & Content Tests (`apps/web/e2e`)

We use **Playwright** to conduct End-to-End tests that simulate real user interactions in a headless browser.

### The "Critical Path" Flow:
Located in `apps/web/e2e/wizard.spec.ts`, this test verifies:
1. **Pantry Scan**: Navigates to the Wizard, enters ingredients.
2. **Restriction Enforcement**: Selects "Vegan/Gluten-Free" and ensures they are sent to the AI.
3. **Generation Loop**: Waits for the AI response and verifies the recipe card displays correct ingredients and tags.
4. **Result Persistence**: Checks that the generated recipe can be viewed in the "My Recipes" dashboard.

---

## 3. Separation of Concerns
| Test Type | Location | Implementation | Responsibility |
| :--- | :--- | :--- | :--- |
| **Unit** | `src/**/*.test.tsx` | Vitest / React Testing Library | Component state and UI edge cases. |
| **Backend Unit** | `tests/test_unit_*.py` | Pytest + Mocks | AI prompt logic and service methods. |
| **Integration** | `tests/test_*.py` | Pytest + Httpx | API contracts and Database state. |
| **E2E** | `e2e/*.spec.ts` | Playwright | Full stack orchestration. |

## 🚀 Running the Suites
```bash
./run.sh test                 # Runs all Vitest and Pytest suites
pnpm --filter frontend e2e    # Runs Playwright E2E tests
```
