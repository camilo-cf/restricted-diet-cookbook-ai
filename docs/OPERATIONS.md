# Operations Manual

## Deployment Strategy
This project is configured for **Continuous Deployment (CD)** via Render Blueprints.
- **Trigger**: Pushing to the `main` branch automatically triggers a new deployment for all services.
- **Config**: Defined in `render.yaml` at the repository root.
- **Detailed Setup**: See the master [DEPLOYMENT.md](../DEPLOYMENT.md) guide.

## Service Initialization
The application uses **Lazy Initialization** for Storage and AI services. 
- **Behavior**: Services are initialized upon the first incoming request or explicit trigger during the application lifespan.
- **Observation**: Monitor logs for `[StorageInitialized]` or `[AIReady]` tags to confirm successful startup in production.

## Monitoring

### 1. Application Logs
Render provides built-in logging for all services.
- **Access**: Go to Render Dashboard -> [Service Name] -> Logs.
- **Retention**: Render free tier logs are ephemeral. For persistent logs, consider adding a Log Stream (e.g., to Datadog or Papertrail) in the future.

### 2. Error Tracking (Sentry)
(Optional - Free Tier Recommended)
1. Create a [Sentry account](https://sentry.io/).
2. Create a new project for "Next.js" (Frontend) and "Python/FastAPI" (Backend).
3. **Frontend Setup**:
   - Add `NEXT_PUBLIC_SENTRY_DSN` to Render Environment Variables for `cookbook-frontend`.
4. **Backend Setup**:
   - Add `SENTRY_DSN` to Render Environment Variables for `cookbook-backend`.
   - The backend `observability.py` module is ready to capture exceptions if initialized with Sentry SDK.

### 3. Uptime Monitoring (UptimeRobot)
(Recommended - Free Tier)
1. Create a [UptimeRobot account](https://uptimerobot.com/).
2. Create a generic **HTTP(s)** monitor.
3. **Frontend Monitor**:
   - URL: `https://<your-frontend-service>.onrender.com/health`
   - Interval: 5 minutes.
4. **Backend Monitor**:
   - URL: `https://<your-backend-service>.onrender.com/health`
   - Interval: 5 minutes.
5. Set up alerts to email/SMS on downtime.

## Rollback Strategy

Rolebacks in Render are straightforward but manual intervention is often safest for data integrity.

### Scenario A: Bad Code Deployment
If a deployment fails or introduces a bug:
1. **Render Dashboard Rollback**:
   - Go to Render Dashboard -> [Service Name] -> "History".
   - Find the last known "Live" deployment (Green).
   - Click **"Rollback to this deploy"**.
   - *Note*: This re-deploys the previous Docker image immediately.

2. **Git Revert (Permanent Fix)**:
   - Identify the bad commit: `git log`.
   - Revert the commit locally: `git revert <commit-hash>`.
   - Push to `main`: `git push origin main`.
   - This triggers a new standard deployment effectively rolling back the code state.

### Scenario B: Database Migration Failure
If a migration fails or corrupts data:
1. **Stop Traffic**: Pause the `cookbook-backend` service in Render to prevent further data damage.
2. **Database Rollback**:
   - Requires manual SQL or Alembic downgrade if scripts are preserved.
   - Run `alembic downgrade -1` locally pointed at the prod DB (requires careful connection string handling) OR deploy a specific fix.
   - *Prevention*: Always test migrations against a copy of prod data (staging) before deploying to `main`.

## Verification Checklist (Post-Deploy)
1. **Health Checks**:
   - Frontend: `curl https://<frontend-url>/health` -> `{"status":"ok"}`
   - Backend: `curl https://<backend-url>/health` -> `{"status":"ok"}`
2. **User Journey**:
   - Visit Frontend URL.
   - Navigate to Wizard -> Ingredients.
   - Ensure page loads without error.
3. **Upload Check**:
   - Upload a test image in the Wizard.
   - Verify it succeeds (Logs should show MinIO interaction).
