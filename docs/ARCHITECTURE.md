# Architecture Overview 🏗️

The **Restricted Diet Cookbook AI** is a professional, full-stack monorepo designed for safety, scalability, and gourmet precision.

## 📁 System Structure

The project follows a modern monorepo layout:

- **`apps/api`**: FastAPI (Python) backend. Handles AI logic, storage orchestration, and RBAC.
- **`apps/web`**: Next.js (TypeScript) frontend. A premium, responsive UI with glassmorphism aesthetics.
- **`docs/`**: Operational and architectural documentation.
- **`openapi.yaml`**: The source of truth for the system's contract.

## 🤝 Contract-First Philosophy

We use **OpenAPI 3.1** as the definitive blueprint for our system. 
- **Type Safety**: The frontend client is automatically generated from the spec, ensuring zero drift between layers.
- **Documentation**: Interactive docs are served at `/docs` (via Swagger) for easy exploration.
- **Consistency**: All endpoints follow RESTful principles with structured error responses (RFC 7807).

## 🛡️ AI Safety & Reliability

To ensure a production-grade experience, we've implemented a multi-layered safety system:

### 1. The Cost Guard
A dedicated service that monitors token usage and budget in real-time. It prevents runaway costs while maintaining a seamless user experience.

### 2. Resilience Circuit Breaker
Our AI integration is protected by distributed circuit breakers. If the OpenAI API or our internal processing hits error thresholds, the system gracefully degrades, informing the user rather than hanging.

### 3. Structured Output (GPT-4o)
We leverage GPT-4o with strict JSON schema enforcement. This guarantees that recipes are always safe, wellformatted, and parsable by the frontend.

## 🗄️ Persistence & Storage

- **Database**: PostgreSQL (via SQLAlchemy) for relational integrity and RBAC user management.
- **Object Storage**: AWS S3 (or compatible) for secure, tiered image hosting (Ingredients vs. Finished Dishes).
- **Authentication**: Secure HttpOnly Cookie-based sessions with CSRF protection.

---
*Built with ❤️ by the Restricted Diet Cookbook Engineering Team*
