# Workflow Engine

Own workflow execution: topological scheduling, node types (chat,
web-search, code-exec, guardrails), import/export JSON, and the starter
templates. Every execution must record activity events and settle budget
exactly-once. Reject cyclic or malformed graphs with clear errors. Demo
fixtures live in demo/fixtures/ and must load unmodified in the studio
import box. Do not add mock-only node types; if a node cannot really
execute, it is not in the demo.
