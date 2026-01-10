# Restricted Diet Cookbook AI - Frontend ⚛️

This is the premium Next.js frontend for the Cookbook AI project.

## 🏗️ Architecture
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Context (`WizardContext`)
- **API Communication**: Centralized via `@cookbook/api-client` (auto-generated from OpenAPI).

## 🧪 Testing
We maintain high test coverage (>90%) to ensure reliability.

### Unit & Component Tests (Vitest)
Tests for individual components, hooks, and context logic.
```bash
pnpm test                 # Run all tests
pnpm test:coverage        # Run tests with coverage report
```

### End-to-End Tests (Playwright)
Validates the full user journey from landing to recipe generation.
```bash
pnpm e2e                  # Run E2E tests (requires backend running)
```

## 🚀 Development
```bash
pnpm dev                  # Start local development server
```

## 📜 Contract Synchronization
This app uses a typed client generated from the root `openapi.yaml`. If the backend API changes:
1. Update `openapi.yaml` at the root.
2. Run `pnpm gen:client` from the root.
3. Fix any TypeScript errors in the frontend.
