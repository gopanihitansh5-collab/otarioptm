"""Direction-aware consistency + provider-reported cost fields.

Zero keys, no provider calls: pure function coverage.
"""
import src.gateway.main as gw


def _outputs():
    return {"calc": {"output": '{"results":[{"model":"a","monthly_cost":1.5},'
                              '{"model":"b","monthly_cost":3.0},'
                              '{"model":"c","monthly_cost":18.4}]}'}}


def test_usage_cost_usd_is_preferred_provider_report():
    assert gw._reported_cost({"usage": {"cost_usd": 0.0124}, "cost": 9.9}) == 0.0124


def test_legacy_top_level_cost_still_read():
    assert gw._reported_cost({"cost": 0.5}) == 0.5
    assert gw._reported_cost({"actual_cost": 0.25}) == 0.25
    assert gw._reported_cost({"usage": {}}) == 0.0
    assert gw._reported_cost("not-a-dict") == 0.0


def test_inverted_budget_claim_is_contradiction():
    text = "qwen3.8-27b costs $18.40 per month, which exceeds the $50 budget."
    cc = gw._consistency_check(text, ["calc"], _outputs(), set())
    assert cc["status"] == "contradiction"
    assert any("18.4" in c and "50" in c for c in cc["contradictions"])


def test_true_budget_claim_stays_cited():
    text = ("Monthly costs: $1.50, $3.00 and $18.40. "
            "All three stay within the $50 budget.")
    cc = gw._consistency_check(text, ["calc"], _outputs(), set())
    assert cc["status"] == "cited"


def test_per_request_numbers_do_not_false_positive():
    text = ("Use openai/gpt-oss-120b, costing only $3.00 per month - $0.00030 "
            "per request - well within the $50 budget. Moreover it is strong. "
            "Others: $1.50 and $18.40.")
    cc = gw._consistency_check(text, ["calc"], _outputs(), set())
    assert cc["status"] == "cited"


def test_uncited_numbers_still_mismatch():
    cc = gw._consistency_check("The best model is obvious.", ["calc"], _outputs(), set())
    assert cc["status"] == "mismatch"


def test_symbol_direction_claim():
    cc = gw._consistency_check("- 27b: $18.40 \u2265 $50", ["calc"], _outputs(), set())
    assert cc["status"] == "contradiction"

def test_cost_zero_is_explicit_not_absent():
    assert gw._reported_cost_value({'usage': {'cost_usd': 0}, 'cost': 9}) == 0
    assert gw._reported_cost_value({}) is None


def test_cost_invalid_falls_back_and_nonfinite_is_not_money():
    for raw in [-1, float('inf'), float('nan'), 'bad', True]:
        assert gw._reported_cost_value({'usage': {'cost_usd': raw}, 'actual_cost': 0.25}) == 0.25
        assert gw._reported_cost_value({'usage': {'cost_usd': raw}}) is None


def test_true_comparisons_negation_and_equality_do_not_false_flag():
    for text in ['$18.40 does not exceed $50', '$3.00 >= $3.00', '$3.00 ≤ $3.00',
                 '$1.50 is under $50; $18.40 is above $3.00']:
        assert not gw._direction_contradictions(text, [1.5, 3, 18.4])


def test_multiple_directions_and_strict_equality():
    assert gw._direction_contradictions('$18.40 is under $50; $3.00 is over $50', [18.4, 3])
    assert gw._direction_contradictions('$3.00 exceeds $3.00', [3])

def test_legacy_zero_preserves_conservative_unreported_semantics():
    assert gw._reported_cost_value({'cost': 0.0}) is None
    assert gw._reported_cost_value({'usage': {'cost_usd': 0.0}}) == 0.0


def test_recorded_run5_prose_is_not_false_flagged():
    from pathlib import Path
    import json
    events = [json.loads(line[6:]) for line in Path('docs/evidence/run5-execution-stream.txt').read_text().splitlines() if line.startswith('data: ')]
    result = next(e for e in events if e.get('nodeId') == 'final' and e['event'] == 'node.completed')
    assert gw._consistency_check(result['output'], ['calc'], _outputs(), set())['status'] == 'cited'
