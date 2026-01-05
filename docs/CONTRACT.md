# API Contract & Patterns

## 1. Authentication (Cookie-based)
We use strict `httpOnly` cookie sessions for security. No JWTs are stored in `localStorage`.

### Flow
1. **Login**: Client POSTs credentials to `/auth/login`. Server sets `session_id` cookie (`httpOnly`, `SameSite=Lax`).
2. **Session**: Browser automatically sends the cookie with every request.
3. **CSRF**: 
   - Safe methods (GET, HEAD, OPTIONS): No CSRF token needed.
   - Unsafe methods (POST, PUT, PATCH, DELETE): Must include `X-CSRF-Token` header.
   - Fetch token from `GET /auth/csrf`.
4. **Logout**: Client POSTs to `/auth/logout`. Server clears the cookie.

## 2. Client Generation
We use `openapi-typescript` to generate strictly typed client code.

**Command:**
```bash
npx openapi-typescript openapi.yaml -o frontend/lib/api-schema.d.ts
```

**Usage (Frontend):**
- Use a wrapper around `fetch` that:
  - Handles `X-CSRF-Token` injection.
  - Types responses using the generated schema.
  - Throws typed errors for `4xx/5xx`.

## 3. Cursor Pagination
Endpoints returning lists (e.g., `GET /recipes`) use cursor pagination for stability.

**Parameters:**
- `limit`: Number of items (default 20, max 100).
- `cursor`: Opaque string for the next page.
- `restrictions`: Filter by dietary tags.

**Response Structure:**
```json
{
  "data": [...items],
  "nextCursor": "base64String...",
  "hasMore": true
}
```

**Cursor Decoding (Backend Internal):**
- Format: `base64(created_at_iso|id)`
- Example: `base64("2023-10-27T10:00:00Z|uuid-1234")`
- Sort Order: `created_at DESC, id DESC`

## 4. Error Handling (RFC 7807)
All errors return `application/problem+json`.

**Schema:**
```json
{
  "type": "about:blank",
  "title": "Validation Error",
  "status": 422,
  "detail": "Field 'email' is invalid.",
  "instance": "/auth/login",
  "correlationId": "req-123-abc"
}
```

## 5. Rate Limiting
Headers included in responses:
- `X-RateLimit-Limit`: Requests allowed per window.
- `X-RateLimit-Remaining`: Requests left.
- `X-RateLimit-Reset`: UTC timestamp when potential resets.

**429 Response:**
Includes `Retry-After` header (seconds).
