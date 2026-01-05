import time
from typing import Callable, Any, TypeVar, Optional
import functools
from app.core.config import settings

T = TypeVar("T")

class CircuitBreakerOpen(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise CircuitBreakerOpen("Circuit is open due to repeated failures")

        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.reset()
            return result
        except Exception as e:
            self.record_failure()
            if self.state == "HALF_OPEN":
                 self.state = "OPEN"
            raise e

    async def call_async(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise CircuitBreakerOpen("Circuit is open due to repeated failures")

        try:
            # Await the coroutine here to catch the exception
            result = await func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.reset()
            return result
        except Exception as e:
            self.record_failure()
            if self.state == "HALF_OPEN":
                 self.state = "OPEN"
            raise e

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"

    def reset(self):
        self.failures = 0
        self.state = "CLOSED"

# Global instances per feature
steps_breaker = CircuitBreaker()
nutrition_breaker = CircuitBreaker()
