# Presentation Slide Outline: Restricted Diet Cookbook AI 🧑‍🍳

## Slide 1: Title & Hook
- **Title**: Restricted Diet Cookbook AI
- **Subtitle**: Safe, Ingredient-Aware Recipes in Seconds
- **Presenter**: Camilo C.F.
- **Visual**: Logo / Screenshot of the Landing Page.

## Slide 2: The Problem
- Dietary restrictions in Bogotá (Celiac, Vegan, Allergies) carry high cognitive load.
- "What can I cook with what's in my fridge?"
- Standard apps are too generic or unsafe.

## Slide 3: The Solution
- **Visual Ingestion**: Snap a photo or list ingredients.
- **Hard Constraints**: Dietary profiles are non-negotiable.
- **AI Core**: GPT-4o powered generation with safety-first prompting.

## Slide 4: Architecture
- **Monorepo**: Next.js (Frontend), FastAPI (Backend), Postgres, MinIO.
- **Contract-First**: OpenAPI defines the source of truth.
- **Storage**: S3-compatible uploads with internal/external endpoint handling.

## Slide 5: AI Engineering & Reliability
- **Structured Output**: Pydantic for guaranteed JSON schemas.
- **Failsafes**: Circuit breakers (Tenacity) + Mock Fallback modes.
- **Verification**: Magic Byte validation for uploaded images.

## Slide 6: Testing & CI
- **Backend**: Pytest with 70%+ coverage.
- **Frontend**: Vitest + Playwright E2E.
- **CI**: GitHub Actions enforcing contract checks on every PR.

## Slide 7: Deployment & Observability
- **Platform**: Render (Automated Blueprint).
- **Monitoring**: Structured JSON logging + Correlation IDs.
- **Storage Adapter**: Local Disk fallback for zero-dependency portability.

## Slide 8: 3-Minute Demo (Preview)
- Step-by-step wizard flow.
- Ingredient photo upload.
- Prompt streaming and results.

## Slide 9: Conclusion & Future
- Production-ready monorepo.
- High-leverage AI tooling during development.
- **Closing**: "Eat safe, cook smart."
