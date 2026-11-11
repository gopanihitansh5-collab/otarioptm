"""Multi-stage task-to-workflow planning.

Separate planning responsibilities, per product direction (2026-11-11):
- decompose   (src/gateway/planner.py): task -> validated DAG
- assignment  (assignment.py):        per-node model/route assignment
- enhancement (enhancement.py):       per-node prompt development

All stages share one PlanningContext (context.py) so the task and every
earlier stage's output stay with later stages. Provider policy: planning and
prompt development run on the free Groq tier first, Otari is the fallback,
the demo tier never plans (stages.py). Every stage validates the model's
JSON before it is applied; a rejected stage degrades to an explicit warning,
never to a preset or invented output.
"""
