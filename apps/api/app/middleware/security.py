from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import os
from collections import defaultdict
import threading

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # HSTS - 1 year
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Clickjacking protection
        response.headers["X-Frame-Options"] = "DENY"
        # MIME-sniffing protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSS Protection (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.clients = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, client_id: str) -> bool:
        if os.environ.get("TESTING") == "True":
            return True
        now = time.time()
        with self.lock:
            # Clean old requests
            self.clients[client_id] = [req_time for req_time in self.clients[client_id] if now - req_time < self.window_seconds]
            
            if len(self.clients[client_id]) >= self.requests_limit:
                return False
            
            self.clients[client_id].append(now)
            return True

# Simple global instances for specific endpoints
auth_limiter = RateLimiter(requests_limit=5, window_seconds=60) # 5 per minute
ai_limiter = RateLimiter(requests_limit=10, window_seconds=3600) # 10 per hour (heavy)

async def rate_limit_auth(request: Request):
    client_ip = request.client.host
    if not auth_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many login/register attempts. Try again later.")

async def rate_limit_ai(request: Request):
    client_ip = request.client.host
    if not ai_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="AI generation limit reached. Try again later.")
