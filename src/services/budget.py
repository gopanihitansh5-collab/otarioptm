"""Budget accounting for OtariOptm.

`BudgetManager` owns every dollar the gateway can spend: reservations are
taken BEFORE a provider call and settled exactly once afterwards.

Accounting rules enforced here:

* `reserve` performs the affordability check AND the mutation under one
  lock, so concurrent steps can never jointly oversubscribe the cap.
* A reservation has exactly ONE terminal action:
  - `record` / `settle` charge the reservation and close it,
  - `release` closes it without charging.
  Both are safe no-ops on an unknown or already-closed id, so a double
  release never corrupts the accounting and a leaked reservation never
  silently inflates `spent`.
* `record` clamps the charge to the project cap: `spent` can never exceed
  `cap`. Anything that did not fit is reported through `overage`.
"""

import asyncio
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, Optional, Tuple

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
            "refill_per_sec": 1.0,  # tokens restored per second per IP
            "global_capacity": 120,        # burst size across ALL IPs per instance
            "global_refill_per_sec": 5.0,  # tokens restored per second (global)
        },
    },
}

# How many closed reservations are remembered (for exactly-once accounting).
MAX_TRACKED_SETTLEMENTS = 512


class BudgetManager:
    """Async-safe budget tracking with reservations and spend recording."""

    def __init__(self, config_path: str | None = None):
        cfg_path = config_path or os.environ.get("OTARIOPTM_CONFIG", "config/config.yml")
        self.config = self._load_config(cfg_path)
        self.spend: float = 0.0
        self.reservations: Dict[str, float] = {}
        self.history: list[Dict[str, Any]] = []
        # Amount that could not be charged because the cap was reached.
        self.overage: float = 0.0
        self.overage_count: int = 0
        self._lock = asyncio.Lock()
        self._reservation_counter = 0
        # Closed reservations: id -> amount that was charged. Guarantees that a
        # reservation is settled exactly once (a second record/release is a
        # no-op instead of a double charge).
        self._settled: Dict[str, float] = {}

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

    @staticmethod
    def _as_float(value: Any) -> float:
        try:
            if value is None:
                return 0.0
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _remember_settled(self, reservation_id: str, charged: float) -> None:
        self._settled[reservation_id] = charged
        if len(self._settled) > MAX_TRACKED_SETTLEMENTS:
            for old in list(self._settled)[: len(self._settled) - MAX_TRACKED_SETTLEMENTS]:
                self._settled.pop(old, None)

    async def reserve(self, estimated_cost: float) -> Tuple[bool, Optional[str]]:
        """Atomically reserve budget for a projected cost.

        Returns (ok, reservation_id). Never claims more than is left, so
        concurrent steps cannot jointly overspend the cap: the check and the
        mutation happen inside the same lock acquisition.
        """
        est = self._as_float(estimated_cost)
        async with self._lock:
            self._reservation_counter += 1
            rid = f"res-{self._reservation_counter}"
            if est <= 0:
                self.reservations[rid] = 0.0
                return True, rid
            available = self.project_cap - (self.spend + sum(self.reservations.values()))
            if est > available:
                return False, None
            self.reservations[rid] = est
            return True, rid

    async def release(self, reservation_id: Optional[str]) -> None:
        """Release a reservation without charging it (step skipped/failed).

        Releasing an unknown or already-released id is a safe no-op, so the
        reservation can never be released twice and never raises.
        """
        if not reservation_id:
            return
        async with self._lock:
            if reservation_id in self._settled:
                # Already terminal (recorded): releasing must not undo it.
                return
            self.reservations.pop(reservation_id, None)
            self._remember_settled(reservation_id, 0.0)

    def _record_locked(self, reservation_id: Optional[str], cost: float) -> Tuple[float, bool]:
        """Charge a reservation once. The caller MUST hold the lock.

        Returns (charged, over_budget). The charge is clamped to the project
        cap: `spent` can never exceed `cap`; the clamped-away amount is
        accumulated in `overage`.
        """
        if reservation_id:
            if reservation_id in self._settled:
                # Already terminal: never charge the same reservation twice.
                return self._settled[reservation_id], False
            if reservation_id not in self.reservations:
                # Unknown id: nothing was reserved, so nothing is charged.
                self._remember_settled(reservation_id, 0.0)
                return 0.0, False
            self.reservations.pop(reservation_id, None)

        headroom = max(0.0, self.project_cap - self.spend)
        charged = min(cost, headroom)
        over_budget = charged < cost
        if over_budget:
            self.overage += cost - charged
            self.overage_count += 1
        self.spend += charged
        if reservation_id:
            self._remember_settled(reservation_id, charged)
        self.history.append({
            "reservation_id": reservation_id,
            "requested": round(cost, 6),
            "charged": round(charged, 6),
            "over_budget": over_budget,
        })
        return charged, over_budget

    async def record(self, reservation_id: Optional[str], actual_cost: float) -> float:
        """Convert a reservation into spend at its actual cost, then close it.

        The charge is clamped to the project cap: `spent` can never exceed
        `cap`. The clamped-away amount is accumulated in `overage`.
        Recording an already-settled or unknown id charges nothing.
        """
        cost = max(0.0, self._as_float(actual_cost))
        async with self._lock:
            self._record_locked(reservation_id, cost)
            return self.spend

    async def settle(self, reservation_id: Optional[str], actual_cost: float) -> Tuple[float, bool]:
        """Terminal action for a reservation: charge it once, clamped to the cap.

        Returns (charged, over_budget). This is the canonical way to close a
        reservation: it records the spend and closes the reservation in one
        atomic step, so there is never a release-then-record pair and the
        freed amount can not be re-claimed while the actual is recorded.
        Settling the same id twice records the spend only once.
        """
        cost = max(0.0, self._as_float(actual_cost))
        async with self._lock:
            return self._record_locked(reservation_id, cost)

    @asynccontextmanager
    async def hold(self, estimated_cost: float) -> AsyncIterator[Tuple[bool, Optional[str]]]:
        """Reserve budget and guarantee the reservation is settled once.

        Yields (ok, reservation_id). If the body raises, the reservation is
        released in the `finally` block, so a failed execution can never leak
        reserved budget. If the body records the reservation, the release is
        a no-op (the reservation is already closed).
        """
        ok, rid = await self.reserve(estimated_cost)
        try:
            yield ok, rid
        finally:
            if rid:
                await self.release(rid)

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
                "overage": round(self.overage, 6),
                "overageCount": self.overage_count,
            }
