"""Shared budget ledger tests (Upstash Redis backend), HTTP fully mocked.

The invariants under test:

* reserve/settle/release/snapshot are single atomic EVAL round-trips -
  there is no check-then-write pair that could interleave across instances.
* a store outage FAILS CLOSED at reserve time (blocked before spend,
  never a silent drop to per-instance accounting) and at get_remaining.
* settlement is idempotent at the store (replays return the original
  charge) and a store failure at settle is surfaced loudly, not swallowed.
* with no store configured the manager stays in per-instance mode and
  labels itself as such.
"""

import asyncio

import httpx
import pytest

from src.services import ledger as ledger_mod
from src.services.budget import BudgetManager
from src.services.ledger import LedgerUnavailable, UpstashLedger


def run(coro):
    return asyncio.run(coro)


class FakeResponse:
    def __init__(self, result=None, status=200, error=None):
        self.status_code = status
        self._result = result
        self._error = error

    def json(self):
        if self._error is not None:
            return {"error": self._error}
        return {"result": self._result}


class FakeClient:
    """Records every command payload; serves canned results in order."""

    calls: list = []
    queue: list = []
    raise_exc: Exception | None = None

    def __init__(self, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, headers=None, json=None):
        type(self).calls.append({"url": url, "headers": headers, "json": json})
        if type(self).raise_exc is not None:
            raise type(self).raise_exc
        result = type(self).queue.pop(0) if type(self).queue else None
        if isinstance(result, Exception):
            raise result
        return result


@pytest.fixture(autouse=True)
def fake_http(monkeypatch):
    FakeClient.calls = []
    FakeClient.queue = []
    FakeClient.raise_exc = None
    monkeypatch.setattr(ledger_mod.httpx, "AsyncClient", FakeClient)
    yield


@pytest.fixture
def store():
    return UpstashLedger("https://example.upstash.io", "token-abc")


def _manager(tmp_path, monkeypatch, with_store=True):
    if with_store:
        monkeypatch.setenv("KV_REST_API_URL", "https://example.upstash.io")
        monkeypatch.setenv("KV_REST_API_TOKEN", "token-abc")
    else:
        monkeypatch.delenv("KV_REST_API_URL", raising=False)
        monkeypatch.delenv("KV_REST_API_TOKEN", raising=False)
        monkeypatch.delenv("UPSTASH_REDIS_REST_URL", raising=False)
        monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN", raising=False)
    return BudgetManager(config_path=str(tmp_path / "missing.yml"))


# --- UpstashLedger transport -------------------------------------------------


def test_reserve_atomic_single_eval(store):
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(store.reserve(0.5, 5.0))
    assert ok and rid and rid.startswith("sh-")
    # Exactly ONE round trip, and it is a single EVAL (atomic check+write),
    # not a GET-then-SET pair.
    assert len(FakeClient.calls) == 1
    cmd = FakeClient.calls[0]["json"]
    assert cmd[0] == "EVAL"
    assert FakeClient.calls[0]["headers"]["Authorization"] == "Bearer token-abc"


def test_reserve_over_cap(store):
    FakeClient.queue = [FakeResponse([0, 5.0])]
    ok, rid = run(store.reserve(0.5, 5.0))
    assert ok is False and rid is None


def test_reserve_store_down_raises(store):
    FakeClient.raise_exc = httpx.ConnectError("down")
    with pytest.raises(LedgerUnavailable):
        run(store.reserve(0.5, 5.0))


def test_settle_charge_and_replay(store):
    FakeClient.queue = [FakeResponse([1, 0.004, 0])]
    charged, over = run(store.settle("sh-x", 0.004, 5.0))
    assert (charged, over) == (0.004, False)
    FakeClient.queue = [FakeResponse([2, 0.004, 0])]  # idempotent replay
    charged, over = run(store.settle("sh-x", 0.004, 5.0))
    assert (charged, over) == (0.004, False)


def test_settle_clamps_to_cap(store):
    FakeClient.queue = [FakeResponse([1, 0.002, 1])]
    charged, over = run(store.settle("sh-y", 0.01, 5.0))
    assert charged == 0.002 and over is True


def test_snapshot_shape(store):
    FakeClient.queue = [FakeResponse([1.5, 0.25, 0.5, 1, 0.1, 2, 3])]
    snap = run(store.snapshot(5.0))
    assert snap["spent"] == 1.5 and snap["reserved"] == 0.25
    assert snap["remaining"] == 3.25 and snap["committed"] == 1.75
    assert snap["assumedSpend"] == 0.5 and snap["assumedCount"] == 1
    assert snap["overage"] == 0.1 and snap["overageCount"] == 2
    assert snap["openReservations"] == 3 and snap["ledger"] == "upstash-redis"


# --- BudgetManager shared mode -----------------------------------------------


def test_shared_mode_reserve_and_settle(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    assert m.ledger is not None
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    assert ok and rid in m._shared_rids
    FakeClient.queue = [FakeResponse([1, 0.004, 0])]
    charged, over = run(m.settle(rid, 0.004))
    assert charged == 0.004 and over is False
    assert rid not in m._shared_rids
    entry = m.history[-1]
    assert entry["ledger"] == "shared" and entry["charged"] == 0.004


def test_shared_mode_zero_cost_stays_local(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    ok, rid = run(m.reserve(0.0))
    assert ok and rid not in m._shared_rids
    assert FakeClient.calls == []  # no round trip for free reservations


def test_shared_reserve_fail_closed_on_outage(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.raise_exc = httpx.ConnectError("down")
    ok, rid = run(m.reserve(0.5))
    assert ok is False and rid is None
    assert m._ledger_error and "down" in m._ledger_error
    assert m.history[-1]["ledger_error"]


def test_shared_get_remaining_fail_closed(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.raise_exc = httpx.ConnectError("down")
    assert run(m.get_remaining()) == 0.0


def test_shared_settle_outage_is_loud(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    assert ok
    FakeClient.raise_exc = httpx.ConnectError("down")
    charged, over = run(m.settle(rid, 0.004))
    assert charged == 0.0 and over is False
    assert m.history[-1]["ledger_error"] and m._ledger_error


def test_shared_release_outage_does_not_raise(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    FakeClient.raise_exc = httpx.ConnectError("down")
    run(m.release(rid))  # must not raise; reservation STAYS counted (safe direction)
    assert m._ledger_error


def test_shared_settle_retries_then_succeeds(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    assert ok
    # First attempt raises, retry succeeds (exceptions can be queued).
    FakeClient.queue = [httpx.ConnectError("down"), FakeResponse([1, 0.004, 0])]
    charged, over = run(m.settle(rid, 0.004))
    assert charged == 0.004 and over is False
    assert m.history[-1]["settled_after_retry"] is True
    assert rid not in m._pending_settlements


def test_shared_settle_pending_queue_and_flush(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    assert ok
    FakeClient.raise_exc = httpx.ConnectError("down")  # all attempts fail
    charged, over = run(m.settle(rid, 0.004))
    assert charged == 0.0 and over is False
    assert m._pending_settlements == {rid: 0.004}
    assert m.history[-1]["settlement_pending"] is True
    # Store recovers: the next operation flushes the pending settlement.
    FakeClient.raise_exc = None
    FakeClient.queue = [FakeResponse([1, 0.004, 0]), FakeResponse([1, 0.5])]
    ok2, rid2 = run(m.reserve(0.5))
    assert ok2
    assert m._pending_settlements == {}
    assert any(h.get("settled_after_retry") for h in m.history)


def test_shared_release_pending_settlement_dropped(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([1, 0.5])]
    ok, rid = run(m.reserve(0.5))
    FakeClient.raise_exc = httpx.ConnectError("down")
    run(m.settle(rid, 0.004))
    assert rid in m._pending_settlements
    FakeClient.raise_exc = None
    FakeClient.queue = [FakeResponse([1, 0])]  # release ok (store idempotent)
    run(m.release(rid))
    assert m._pending_settlements == {} and rid not in m._shared_rids


def test_shared_snapshot_labels_backend(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.queue = [FakeResponse([0.0, 0.0, 0.0, 0, 0.0, 0, 0])]
    snap = run(m.snapshot())
    assert snap["ledger"] == "upstash-redis"


def test_shared_snapshot_unavailable_is_labeled(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=True)
    FakeClient.raise_exc = httpx.ConnectError("down")
    snap = run(m.snapshot())
    assert snap["ledger"] == "upstash-redis-unavailable"
    assert snap["remaining"] == 0.0 and snap["lastError"]


# --- Per-instance mode unchanged ----------------------------------------------


def test_per_instance_mode_without_store(tmp_path, monkeypatch):
    m = _manager(tmp_path, monkeypatch, with_store=False)
    assert m.ledger is None
    ok, rid = run(m.reserve(0.5))
    assert ok and FakeClient.calls == []
    run(m.settle(rid, 0.004))
    snap = run(m.snapshot())
    assert snap["ledger"] == "per-instance" and snap["spent"] == 0.004


def test_env_alternate_names(monkeypatch):
    monkeypatch.delenv("KV_REST_API_URL", raising=False)
    monkeypatch.delenv("KV_REST_API_TOKEN", raising=False)
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://alt.upstash.io")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "tok")
    led = UpstashLedger.from_env()
    assert led is not None
