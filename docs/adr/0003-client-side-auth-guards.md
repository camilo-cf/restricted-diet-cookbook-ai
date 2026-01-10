# ADR 0003: Client-Side Auth Guards for Multi-Domain Deployment

## Status
Accepted

## Context
Deploying the application on Render.com involves hosting the frontend and backend on different subdomains (e.g., `cookbook-frontend.onrender.com` and `cookbook-backend.onrender.com`). While we have configured the backend to use `SameSite=None; Secure` cookies to allow cross-site session management, Next.js **Middleware** (which runs on the server edge) is often unable to "see" these cookies during the request pipeline. This is due to the browser not sending third-party cookies to the edge runtime in certain configurations or privacy settings, leading to "false positive" redirects where a logged-in user is redirected back to the login page.

## Decision
We have decided to move "Protected Route" logic from server-side middleware to **Client-Side Auth Guards** within Next.js layouts:

1.  **Middleware Simplification**: The `middleware.ts` is now only used for simple routing logic that doesn't depend on backend session visibility.
2.  **Layout-Based Protection**: Sensitive sections (like `/wizard` and `/profile`) now use a `useEffect` hook in their respective `layout.tsx` or `page.tsx` to verify the session via the `/auth/me` endpoint.
3.  **Loading States**: While the session is being verified client-side, a loading spinner is shown to prevent content flashing and ensure a smooth UX.
4.  **Graceful Redirects**: If the API returns a 401 Unauthorized, the client-side router handles the redirect to `/login` with a `from` query parameter to allow returning after login.

## Alternatives Considered
- **Server-Side Sessions (SSR)**: Requiring the frontend to act as a proxy for all session data. This adds significant complexity and latency.
- **JWT in LocalStorage**: More vulnerable to XSS attacks. We prefer the security of `HttpOnly` cookies.
- **Custom Proxy**: Setting up a dedicated reverse proxy (like Nginx) to map both services to the same domain. This is not easily supported in a standard Render "v3" static/web service setup without additional cost or complexity.

## Consequences
- **Pros**:
    - **Reliability**: Guarantees that authentication checks work correctly across different subdomains on Render.
    - **UX**: Allows for custom loading animations and more granular control over what happens when a session expires.
    - **Security**: Maintains the use of `HttpOnly; Secure` cookies, the gold standard for session safety.
- **Cons**:
    - **Client-Side Dependency**: Requires one additional API call on the first load of a protected page.
    - **Code Distribution**: Protection logic is slightly more spread out across layouts rather than being in a single global middleware file.
