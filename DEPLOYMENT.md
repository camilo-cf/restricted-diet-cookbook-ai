# Production Deployment Guide 🚀

This document provides technical guidance for deploying the **Restricted Diet Cookbook AI** in a production environment.

## 🏗️ Infrastructure Overview

The application is designed for a containerized, microservices-oriented architecture:

- **Frontend**: Next.js (SSR/Static) deployed via Docker.
- **Backend**: FastAPI (Asynchronous) with Uvicorn/Gunicorn.
- **Database**: PostgreSQL with connection pooling.
- **Storage**: S3-compatible object storage (e.g., MinIO, AWS S3, Cloudflare R2).
- **AI**: OpenAI GPT-4 API with circuit breakers and cost guards.

---

## 💾 Storage Configuration (Critical)

The application uses **S3 Presigned URLs** for direct browser uploads. This requires a two-tier endpoint configuration:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `STORAGE_BACKEND` | Switch between `minio` (S3) or `disk` (Local). | `disk` |
| `AWS_ENDPOINT_URL` | **Internal** endpoint used by the Backend to talk to the bucket. | `http://minio:9000` |
| `PUBLIC_AWS_ENDPOINT_URL` | **Public** endpoint used by the Browser to upload the file. | `https://storage.example.com` |

> [!IMPORTANT]
> **Render Free Tier Storage**: Since persistent disks are not available for free web services, the `STORAGE_BACKEND=minio` (connecting to a separate MinIO service with its own disk) is preferred. However, `STORAGE_BACKEND=disk` is implemented as a minimal fallback (ephemeral storage).

---

## ⚡ Scaling & Performance

### 1. Backend Workers
In production, use **Gunicorn** with the `uvicorn.workers.UvicornWorker` to manage multiple processes.
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

### 2. Database Pooling
The application uses SQLAlchemy's asynchronous pooling. Configure these variables based on your PostgreSQL instance capacity:
- `POOL_SIZE`: Number of persistent connections per worker.
- `DB_TIMEOUT`: Connection timeout in seconds.

### 3. Lazy initialization
Our services (Storage, AI) use **Lazy Initialization**. They do not block application startup on network calls. Ensure monitoring is in place to catch initialization warnings in logs during first-request execution.

---

## 🛡️ Security Best Practices

1. **HTTPS Enforcement**: Always serve both Frontend and Backend over TLS.
2. **Secret Management**:
   - `SECRET_KEY`: Use a cryptographically secure 32+ character string.
   - `OPENAI_API_KEY`: Rotate periodically and use Environment Secrets (e.g., Render Secrets, AWS Secrets Manager).
3. **CORS Settings**: Restrict `CORS_ORIGINS` strictly to your production frontend domains.
4. **Cookie Security (Cross-Domain)**:
   - When frontend and backend are on different subdomains (common on Render), set `SESSION_COOKIE_SAMESITE=none` and `SESSION_COOKIE_SECURE=true` in the backend.
   - Note: Modern browsers require `Secure=true` if `SameSite=None` is used.
5. **S3 Permissions**:
   - The primary `AWS_ACCESS_KEY_ID` should have restricted permissions to ONLY the application bucket.
   - Use **CORS configuration** on the bucket to only allow `PUT` from your domain.

---

## 📊 Observability

- **Structured Logging**: The backend uses `structlog`. Logs are outputted in JSON format in production for easy ingestion by ELK, Datadog, or Sentry.
- **Health Checks**:
  - Backend: `/health` (Checks DB, Storage, and AI readiness).
  - Frontend: `/health` (Standard Next.js health check).

---

## 🚀 One-Click Deployment (Render)

The easiest way to deploy is using the provided `render.yaml` Blueprint.

1. Connect your GitHub repository to Render.
2. Render will detect the `render.yaml` and create the Full Stack (Frontend, Backend, DB, and MinIO).
3. **Manual Step**: Go to the **cookbook-backend** settings in Render and manually add your `OPENAI_API_KEY`.

---
*Maintained by the Restricted Diet Cookbook AI Engineering Team.*
