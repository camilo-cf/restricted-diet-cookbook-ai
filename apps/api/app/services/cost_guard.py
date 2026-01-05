from datetime import datetime
from app.core.config import settings

class CostGuard:
    def __init__(self, monthly_limit_usd: float = 5.0):
        self.monthly_limit_usd = monthly_limit_usd
        self.current_spend_usd = 0.0 # Persistence to Redis/DB needed for real prod
        self.tokens_used = 0

    def can_proceed(self, estimated_cost: float = 0.01) -> bool:
        if self.current_spend_usd + estimated_cost > self.monthly_limit_usd:
            return False
        return True

    def record_usage(self, tokens_in: int, tokens_out: int, model: str):
        # Approximations for gpt-3.5-turbo
        cost_in = (tokens_in / 1000) * 0.0005
        cost_out = (tokens_out / 1000) * 0.0015
        self.current_spend_usd += (cost_in + cost_out)
        self.tokens_used += (tokens_in + tokens_out)

cost_guard = CostGuard()
