import asyncio
import os
from typing import Dict, Any

import yaml

DEFAULT_CONFIG = {
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
    "gateway": {
        "rate_limit": {
            "enabled": True,
            "capacity": 30,        # burst size per IP on mutating endpoints
            "refill_per_sec": 1.0,  # tokens restored per second
        },
    },
}


class BudgetManager:
    """Thread/async-safe budget tracking with reservations and spend recording."""

    def __init__(self, config_path: str | None = None):
        cfg_path = config_path or os.environ.get("OTARIOPTM_CONFIG", "config/config.yml")
        self.config = self._load_config(cfg_path)
        self.spend: float = 0.0
        self.reservations: Dict[str, float] = {}
        self.history: list[Dict[str, Any]] = []
        self._lock = asyncio.Lock()
        self._reservation_counter = 0

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        merged = dict(DEFAULT_CONFIG)
        for section, values in merged.items():
            if isinstance(values, dict):
                merged[section] = dict(values)
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                user_config = yaml.safe_load(f) or {}
                for section, values in user_config.items():
                    if isinstance(values, dict) and isinstance(merged.get(section), dict):
                        merged[section].update(values)
                    else:
                        merged[section] = values
        return merged

    @property
    def project_cap(self) -> float:
        return float(self.config["budget"]["project_cap"])

    @property
    def committed(self) -> float:
        """Spend + open reservations, the amount that must not be exceeded."""
        return self.spend + sum(self.reservations.values())

    @property
    def remaining(self) -> float:
        return max(0.0, self.project_cap - self.committed)

    async def reserve(self, estimated_cost: float) -> tuple[bool, str | None]:
        """Atomically reserve budget for a projected cost.

        Returns (ok, reservation_id). Never claims more than is left, so
        concurrent steps cannot jointly overspend the cap.
        """
        if estimated_cost <= 0:
            async with self._lock:
                self._reservation_counter += 1
                rid = f"res-{self._reservation_counter}"
                self.reservations[rid] = 0.0
                return True, rid
        async with self._lock:
            available = self.project_cap - (self.spend + sum(self.reservations.values()))
            if estimated_cost > available:
                return False, None
            self._reservation_counter += 1
            rid = f"res-{self._reservation_counter}"
            self.reservations[rid] = float(estimated_cost)
            return True, rid

    async def release(self, reservation_id: str) -> None:
        """Release a reservation without charging it (step was skipped/failed)."""
        async with self._lock:
            self.reservations.pop(reservation_id, None)

    async def record(self, reservation_id: str, actual_cost: float) -> float:
        """Convert a reservation into spend at its actual cost, then close it."""
        async with self._lock:
            self.reservations.pop(reservation_id, None)
            cost = max(0.0, float(actual_cost))
            self.spend += cost
            return self.spend

    async def get_spent(self) -> float:
        async with self._lock:
            return self.spend

    async def get_remaining(self) -> float:
        async with self._lock:
            return max(0.0, self.project_cap - (self.spend + sum(self.reservations.values())))

    async def snapshot(self) -> Dict[str, Any]:
        async with self._lock:
            committed = self.spend + sum(self.reservations.values())
            return {
                "cap": self.project_cap,
                "spent": round(self.spend, 6),
                "reserved": round(sum(self.reservations.values()), 6),
                "committed": round(committed, 6),
                "remaining": round(max(0.0, self.project_cap - committed), 6),
            }
