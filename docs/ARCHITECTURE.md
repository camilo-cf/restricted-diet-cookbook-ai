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

## 🎨 User Experience & Feedback

### Toast Notification System
All user-facing feedback messages are delivered through a unified toast notification system (`useToast` hook). This provides:
- **Consistency**: Success, error, and informational messages have a uniform appearance across the app.
- **Non-blocking UX**: Toasts auto-dismiss after a timeout, keeping users in flow.
- **Accessibility**: Messages are visible regardless of scroll position.

Toast notifications are used for:
- **Authentication**: Login/register success and error feedback
- **Recipe Operations**: Create, save, delete confirmations
- **Photo Uploads**: Upload progress and errors
- **Profile Management**: Profile updates and deletions

## 🗄️ Persistence & Storage

- **Database**: PostgreSQL (via SQLAlchemy) for relational integrity and RBAC user management.
- **Object Storage**: Multi-backend support for scale and flexibility.
  - **Production (Cloudflare R2 / AWS S3)**: S3-compatible object storage for secure, persistent image hosting. Recommended for production to avoid data loss on container restarts.
  - **Development (Local Disk)**: Local filesystem storage for rapid development.
- **Authentication**: Secure `HttpOnly` Cookie-based sessions.
  - **Cross-Domain Support**: Backend uses `SameSite=None; Secure` to allow session persistence between Render subdomains.
  - **Auth Guards**: Implemented via client-side layouts (`/wizard`, `/profile`) to ensure compatibility with Render's edge routing that might obscure cookies from server-side middleware.
  - **Privacy**: Users have full control to permanently delete their account and associated data (GDPR compliant).

## 📈 Scalability & Performance

The Restricted Diet Cookbook AI is engineered for growth, utilizing a cloud-native, stateless architecture.

### Current Scaling Capabilities
- **API (Horizontal)**: The FastAPI backend is entirely stateless. It can be scaled horizontally by increasing the number of replicas behind the Render/Cloud load balancer. Each instance handles multiple concurrent requests via Python's `asyncio` loop.
- **Frontend (Edge)**: The Next.js frontend is optimized for static serving and can be globally distributed via CDN (Content Delivery Network), ensuring low-latency UX regardless of user location.
- **Object Storage (S3)**: Leveraging specialized object storage ensures that image uploads (Ingredients/Dishes) scale independently of the application logic.

### Identified Bottlenecks & Limits
1.  **AI Provider Limits**: The primary bottleneck for throughput is the OpenAI API Rate Limits (RPM/TPM). High-volume traffic requires higher-tier API accounts or a round-robin strategy across multiple providers.
2.  **Database Connections**: PostgreSQL has a finite connection pool. For extreme scale (>10k concurrent users), we recommend implementing **PgBouncer** or a similar connection pooler to prevent saturation.
3.  **LLM Latency**: Each recipe generation takes 3-10 seconds. This is a "wait-heavy" operation.

### Scaling Roadmap
| Phase | Action | Impact |
| :--- | :--- | :--- |
| **Medium Traffic** | Redis Caching | Cache common ingredient-to-recipe mappings to bypass LLM latency and cost. |
| **High Traffic** | Celery/Task Queue | Offload recipe generation to background workers to prevent long-running HTTP connections. |
| **Global Scale** | Read Replicas | Implement Postgres Read Replicas for high-performance recipe browsing across regions. |

---
*Built with ❤️ by the Restricted Diet Cookbook Engineering Team*
