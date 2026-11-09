import yaml
import os
from typing import Optional, Dict, Any


class BudgetManager:
    def __init__(self, config_path: str = "config/config.yml"):
        self.config = self._load_config(config_path)
        self.spend: float = 0.0
        self.reservations: Dict[str, float] = {}
        self.lock = __import__("asyncio").Lock() if hasattr(__import__("asyncio"), "Lock") else None

    def _load_config(self, config_path: Dict[str, Any]) -> Dict[str, Any]:
        default_config = {
            "otari": {
                "base_url": "https://eu.api.otari.ai/api/v1",
                "auth_token": "${OTARI_API_KEY}",
            },
            "models": {
                "default": "alibaba/qwen-3.5-35b-a3b",
                "fallback": "openai:gpt-4o-mini",
            },
            "budget": {
                "project_cap": 5.00,
                "per_user": 2.00,
            },
            "workflows": {
                "max_steps": 10,
                "max_tokens": 4000,
            },
            "profiles": {
                "code-exec": True,
                "web-search": True,
                "guardrails": True,
            },
        }
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                user_config = yaml.safe_load(f)
                if user_config:
                    default_config.update(user_config)
        return default_config

    @property
    def project_cap(self) -> float:
        return float(self.config["budget"]["project_cap"])

    async def reserve(self, estimated_cost: float, reservation_id: str) -> bool:
        """Reserve budget for a projected cost. Returns True if reservation successful."""
        async with self._get_lock():
            spent = await self.get_spent() if hasattr(self, 'get_spent') else 0.0
            remaining = self.project_cap - spent
            if estimated_cost > remaining:
                return False
            self.reservations[reservation_id] = estimated_cost
            return True

    async def release(self, reservation_id: str) -> None:
        """Release a budget reservation."""
        async with self._get_lock():
            self.reservations.pop(reservation_id, None)

    async def get_spent(self) -> float:
        """Get total spent amount."""
        async with self._get_lock():
            return self.spend

    async def get_remaining(self) -> float:
        """Get remaining budget."""
        async with self._get_lock():
            return self.project_cap - self.spend

    async def check_budget(self, cost: float) -> bool:
        """Check if cost fits within remaining budget."""
        remaining = await self.get_remaining()
        return cost <= remaining

    def _get_lock(self):
        if self.lock:
            return self.lock()
        return self._sync_lock()

    def _sync_lock(self):
        class _Lock:
            def __enter__(self):
                pass
            def __exit__(self, *args):
                pass
        return _Lock()