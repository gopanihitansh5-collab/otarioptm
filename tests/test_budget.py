"""BudgetManager unit tests: caps, reservations, settlement semantics.

The invariants under test:

* a reservation has exactly ONE terminal action (`record`/`settle` or
  `release`); releasing an unknown id is a safe no-op,
* spend is clamped to the project cap and the overage is flagged,
* concurrent reservations can never jointly exceed the cap,
* a failed execution never leaks a reservation,
* `reserve` -> `settle` records the spend exactly once.
"""

import asyncio

import pytest

from src.services.budget import BudgetManager


def run(coro):
    return asyncio.run(coro)


def _manager(tmp_path, cap=None):
    if cap is None:
        return BudgetManager(config_path=str(tmp_path / "missing.yml"))
    cfg = tmp_path / "config.yml"
    cfg.write_text(f"budget:\n  project_cap: {cap}\n")
    return BudgetManager(config_path=str(cfg))


# --- configuration ------------------------------------------------------------

def test_defaults_load_without_config_file(tmp_path):
    bm = _manager(tmp_path)
    assert bm.project_cap == 5.00
    assert bm.config["workflows"]["max_steps"] == 10


def test_custom_cap_from_yaml(tmp_path):
    bm = _manager(tmp_path, cap=0.10)
    assert bm.project_cap == 0.10


# --- (a) releasing an unknown id is a safe no-op ------------------------------

def test_release_of_unknown_id_is_a_noop(tmp_path):
    bm = _manager(tmp_path)
    run(bm.release("res-does-not-exist"))
    run(bm.release(None))
    run(bm.release(""))
    assert run(bm.get_spent()) == 0.0
    assert run(bm.get_remaining()) == pytest.approx(5.00)
    snap = run(bm.snapshot())
    assert snap["reserved"] == 0.0
    assert snap["spent"] == 0.0


def test_double_release_is_a_noop(tmp_path):
    bm = _manager(tmp_path)
    ok, rid = run(bm.reserve(1.0))
    assert ok and rid
    run(bm.release(rid))
    run(bm.release(rid))
    snap = run(bm.snapshot())
    assert snap["reserved"] == 0.0
    assert snap["spent"] == 0.0


# --- (b) spend is clamped to the cap and the overage is flagged ---------------

def test_spend_is_clamped_to_cap_and_overage_flagged(tmp_path):
    bm = _manager(tmp_path, cap=1.0)
    ok, rid = run(bm.reserve(0.5))
    assert ok and rid

    charged, over_budget = run(bm.settle(rid, 5.0))
    assert charged == pytest.approx(1.0), "the charge is clamped to the cap"
    assert over_budget is True

    snap = run(bm.snapshot())
    assert snap["spent"] == pytest.approx(1.0)
    assert snap["spent"] <= snap["cap"]
    assert snap["overage"] == pytest.approx(4.0)
    assert snap["overageCount"] == 1
    assert bm.overage > 0.0


def test_record_clamps_spend_to_cap(tmp_path):
    bm = _manager(tmp_path, cap=2.0)
    ok, rid = run(bm.reserve(0.25))
    assert ok and rid
    spent = run(bm.record(rid, 10.0))
    assert spent == pytest.approx(2.0)
    assert run(bm.get_spent()) == pytest.approx(2.0)
    assert run(bm.get_remaining()) == pytest.approx(0.0)


# --- (c) concurrent reservations never exceed the cap -------------------------

def test_concurrent_reserves_never_exceed_the_cap(tmp_path):
    bm = _manager(tmp_path, cap=1.0)

    async def scenario():
        results = await asyncio.gather(*[bm.reserve(0.3) for _ in range(20)])
        granted = [rid for ok, rid in results if ok]
        snapshot = await bm.snapshot()
        return granted, snapshot

    granted, snapshot = run(scenario())
    assert len(granted) <= 3, "only 3 x 0.3 fit into a 1.00 cap"
    assert snapshot["reserved"] <= snapshot["cap"]
    assert snapshot["committed"] <= snapshot["cap"]
    assert snapshot["remaining"] >= 0.0


def test_reserve_beyond_cap_refused(tmp_path):
    bm = _manager(tmp_path, cap=5.0)
    ok, rid = run(bm.reserve(4.50))
    assert ok
    ok2, rid2 = run(bm.reserve(1.00))
    assert not ok2 and rid2 is None
    run(bm.record(rid, 4.50))
    ok3, _ = run(bm.reserve(0.60))
    assert not ok3
    ok4, _ = run(bm.reserve(0.50))
    assert ok4


# --- (d) a failed execution does not leak a reservation ----------------------

def test_failed_execution_does_not_leak_a_reservation(tmp_path):
    bm = _manager(tmp_path, cap=2.0)

    async def scenario():
        try:
            async with bm.hold(1.0) as (ok, rid):
                assert ok and rid
                raise RuntimeError("provider exploded")
        except RuntimeError:
            pass
        return await bm.snapshot()

    snapshot = run(scenario())
    assert snapshot["reserved"] == 0.0, "the reservation must be released"
    assert snapshot["spent"] == 0.0
    assert snapshot["remaining"] == pytest.approx(2.0)


def test_failed_execution_with_manual_finally_does_not_leak(tmp_path):
    bm = _manager(tmp_path, cap=2.0)

    async def scenario():
        ok, rid = await bm.reserve(1.0)
        assert ok and rid
        try:
            raise RuntimeError("provider exploded")
        except RuntimeError:
            pass
        finally:
            await bm.release(rid)
        return await bm.snapshot()

    snapshot = run(scenario())
    assert snapshot["reserved"] == 0.0
    assert snapshot["spent"] == 0.0


# --- (e) reserve -> settle records exactly once -------------------------------

def test_reserve_then_settle_records_exactly_once(tmp_path):
    bm = _manager(tmp_path, cap=5.0)
    ok, rid = run(bm.reserve(1.0))
    assert ok and rid

    charged, over_budget = run(bm.settle(rid, 0.75))
    assert charged == pytest.approx(0.75)
    assert over_budget is False
    assert run(bm.get_spent()) == pytest.approx(0.75)

    # Settling the same reservation again must not charge it twice.
    charged_again, _ = run(bm.settle(rid, 0.75))
    assert charged_again == pytest.approx(0.75)
    assert run(bm.get_spent()) == pytest.approx(0.75), "exactly one charge per reservation"

    snap = run(bm.snapshot())
    assert snap["reserved"] == 0.0
    assert snap["spent"] == pytest.approx(0.75)


def test_record_after_release_does_not_charge(tmp_path):
    """A released reservation is closed: a later record must not re-charge it."""
    bm = _manager(tmp_path, cap=5.0)
    ok, rid = run(bm.reserve(1.0))
    assert ok and rid
    run(bm.release(rid))
    run(bm.record(rid, 1.0))
    assert run(bm.get_spent()) == pytest.approx(0.0)


def test_reserve_within_cap_then_record(tmp_path):
    bm = _manager(tmp_path, cap=5.0)
    ok, rid = run(bm.reserve(1.25))
    assert ok and rid
    spent = run(bm.record(rid, 1.00))
    assert spent == pytest.approx(1.00)
    assert run(bm.get_remaining()) == pytest.approx(4.00)


def test_zero_cost_reservation_always_ok(tmp_path):
    bm = _manager(tmp_path)
    ok, rid = run(bm.reserve(0.0))
    assert ok and rid


def test_snapshot_shape(tmp_path):
    bm = _manager(tmp_path)
    snap = run(bm.snapshot())
    for key in ("cap", "spent", "reserved", "committed", "remaining", "overage"):
        assert key in snap
    assert snap["cap"] == 5.00
