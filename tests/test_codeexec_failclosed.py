"""Regression: code-exec must fail closed while sandbox hardening is in flight."""
import asyncio

from src.gateway.main import CODE_EXEC_DISABLED, _run_code


def test_code_exec_fail_closed():
    assert CODE_EXEC_DISABLED is True
    res = asyncio.run(_run_code("print(1)"))
    assert res["ok"] is False
    assert "unavailable" in res["output"]
    assert res["error"]
