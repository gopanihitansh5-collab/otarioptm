"""{{node-id.field}} resolves into structured code-exec stdout.

The planner emits field references like {{calc.rows}} against code nodes
that print a JSON object; the runner must resolve them or the model
receives a literal placeholder.
"""

import src.gateway.main as gw


def test_field_from_json_stdout():
    outputs = {"calc": {"output": '{"rows": [{"model": "a", "monthly_cost": 1.5}], "pricing_url": "https://x"}'}}
    assert gw._substitute("costs: {{calc.rows}}", outputs) == 'costs: [{"model": "a", "monthly_cost": 1.5}]'
    assert gw._substitute("src {{calc.pricing_url}}", outputs) == "src https://x"


def test_field_from_python_dict_repr():
    outputs = {"calc": {"output": "{'pricing_url': 'https://x', 'n': 3}"}}
    assert gw._substitute("{{calc.pricing_url}}", outputs) == "https://x"
    assert gw._substitute("{{calc.n}}", outputs) == "3"


def test_missing_field_stays_literal():
    outputs = {"calc": {"output": '{"rows": []}'}}
    assert gw._substitute("{{calc.nope}}", outputs) == "{{calc.nope}}"
    outputs2 = {"calc": {"output": "plain text"}}
    assert gw._substitute("{{calc.rows}}", outputs2) == "{{calc.rows}}"


def test_whole_node_reference_unchanged():
    outputs = {"calc": {"output": "7.09"}}
    assert gw._substitute("{{calc}}", outputs) == "7.09"
