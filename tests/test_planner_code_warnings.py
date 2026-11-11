"""Plan-time static checks on generated code-exec nodes.

Checks are inspectable warnings only: the code is never edited, and the
plan is still returned. Catches the live-observed failure where generated
code defined `requests` but referenced `reqs`.
"""

import src.gateway.planner as planner


def _plan(code):
    return {
        "nodes": [
            {"id": "calc-1", "type": "code-exec", "code": code},
            {"id": "final-1", "type": "chat", "prompt": "Report {{calc-1}}"},
        ],
        "edges": [{"source": "calc-1", "target": "final-1"}],
    }


def test_undefined_name_warns_and_code_is_unchanged():
    buggy = "requests=10000\ninp_m=reqs*800\nprint(inp_m)"
    nodes, edges, warnings = planner.validate_plan(_plan(buggy))
    assert any("undefined name" in w and "reqs" in w for w in warnings), warnings
    code = [n for n in nodes if n["id"] == "calc-1"][0]["data"]["code"]
    assert code == buggy  # never edited


def test_clean_code_has_no_undefined_name_warning():
    good = "requests=10000\ninp_m=requests*800\nprint(f'{inp_m:.2f}')"
    _, _, warnings = planner.validate_plan(_plan(good))
    assert not any("undefined name" in w for w in warnings), warnings


def test_syntax_error_warns():
    _, _, warnings = planner.validate_plan(_plan("def broken(:\n"))
    assert any("syntax error" in w for w in warnings), warnings


def test_imports_and_functions_not_flagged():
    code = "import json\ndef f(x):\n    return json.dumps(x)\nprint(f({'a': 1}))"
    _, _, warnings = planner.validate_plan(_plan(code))
    assert not any("undefined name" in w for w in warnings), warnings
