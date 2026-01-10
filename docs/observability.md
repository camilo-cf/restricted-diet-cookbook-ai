# Observability Guide

The Restricted Diet Cookbook AI is built with observability as a core principle, ensuring that every request can be tracked and debugged across the system.

## 1. Request Tracking
We use a Custom Middleware to assign a unique `request_id` (UUIDv4) to every incoming HTTP request.
- **Header**: `X-Request-Id`
- **Correlation**: This ID is injected into the logging context and returned in the response headers.

## 2. Structured Logging
The backend uses `structlog` to produce structured JSON logs in production. This format is ideal for ingestion by modern log management tools (Vector, ELK, Datadog, Render Logs).

### Key Log Fields
- `timestamp`: ISO 8601 format.
- `level`: info, error, warning.
- `request_id`: The unique correlation ID.
- `method`: HTTP Verb.
- `path`: API Endpoint.
- `status`: HTTP Response Code.
- `duration`: Time taken in seconds.

## 3. Sample JSON Log entry (Sanitized)
This is an example of what a successful recipe generation request looks like in the logs:

```json
{
  "request_id": "8f8c876a-5c2d-4f1b-9e3a-4a2b1c0d9e8f",
  "level": "info",
  "timestamp": "2026-01-10T15:04:22.123456Z",
  "event": "request_completed",
  "method": "POST",
  "path": "/ai/recipe",
  "status": 200,
  "duration": 1.452,
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."
}
```

## 4. Local vs Production
- **Local**: Logs are printed to the console. If you use the `./run.sh dev` command, you can see them in real-time.
- **Production (Render)**: Render captures stdout and displays it in the "Logs" tab of each service. Our JSON format ensures these logs are searchable and filterable.
