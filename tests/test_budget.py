"""BudgetManager unit tests: caps, reservations, spend recording."""

import asyncio

import pytest

from src.services.budget import BudgetManager


def run(coro):
    return asyncio.run(coro)


def test_defaults_load_without_config_file(tmp_path):
    bm = BudgetManager(config_path=str(tmp_path / "missing.yml"))
    assert bm.project_cap == 5.00
    assert bm.config["workflows"]["max_steps"] == 10


def test_custom_cap_from_yaml(tmp_path):
    cfg = tmp_path / "config.yml"
    cfg.write_text("budget:\n  project_cap: 0.10\n")
    bm = BudgetManager(config_path=str(cfg))
    assert bm.project_cap == 0.10


def test_reserve_within_cap_then_record():
    bm = BudgetManager(config_path="/nonexistent.yml")
    ok, rid = run(bm.reserve(1.25))
    assert ok and rid
    spent = run(bm.record(rid, 1.00))
    assert spent == 1.00
    assert run(bm.get_remaining()) == pytest.approx(4.00)


def test_reserve_beyond_cap_refused():
    bm = BudgetManager(config_path="/nonexistent.yml")
    ok, rid = run(bm.reserve(4.50))
    assert ok
    # Only 0.50 left unreserved; a second large reservation must fail.
    ok2, rid2 = run(bm.reserve(1.00))
    assert not ok2 and rid2 is None
    # Recording the first frees nothing beyond actual spend.
    run(bm.record(rid, 4.50))
    ok3, _ = run(bm.reserve(0.60))
    assert not ok3
    ok4, _ = run(bm.reserve(0.50))
    assert ok4


def test_release_frees_reservation():
    bm = BudgetManager(config_path="/nonexistent.yml")
    ok, rid = run(bm.reserve(4.50))
    assert ok
    run(bm.release(rid))
    ok2, _ = run(bm.reserve(4.50))
    assert ok2


def test_zero_cost_reservation_always_ok():
    bm = BudgetManager(config_path="/nonexistent.yml")
    ok, rid = run(bm.reserve(0.0))
    assert ok and rid


def test_snapshot_shape():
    bm = BudgetManager(config_path="/nonexistent.yml")
    snap = run(bm.snapshot())
    for key in ("cap", "spent", "reserved", "committed", "remaining"):
        assert key in snap
    assert snap["cap"] == 5.00
