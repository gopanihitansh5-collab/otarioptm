# Install this OpenCode team in OtariOptm

1. Extract this bundle into the root of your `otarioptm` repository.
2. Merge the included `AGENTS.md` into your existing root `AGENTS.md` if one already exists; do not overwrite project-specific instructions blindly.
3. Keep the `.opencode/agents/`, `.opencode/skills/` and `.opencode/commands/` directories at the repository root.
4. Start a fresh OpenCode session so it discovers the Markdown instructions and agents.
5. Select the `orchestrator` primary agent in OpenCode, or start the CLI with `opencode --agent orchestrator` if supported by your installed CLI version.
6. Try `/parallel inspect the workflow execution path and identify the highest-priority reliability improvements`.
7. Check loaded agents with `opencode agent list`.

## What is included

- `AGENTS.md`: project-wide operating rules and delegation contract.
- `.opencode/agents/orchestrator.md`: primary engineering lead.
- `.opencode/agents/*.md`: specialist subagents.
- `.opencode/skills/*/SKILL.md`: reusable project and parallel-work guidance.
- `.opencode/commands/parallel.md`: `/parallel` command prompt.

## Important

This bundle intentionally does not include `opencode.json` or `opencode.jsonc`, so it does not change editor/IDE settings or global OpenCode configuration. You must select the orchestrator agent for a session; the Markdown files alone do not change OpenCode's global default agent. If you want it to become the default later, add `default_agent: "orchestrator"` to your existing OpenCode config after reviewing/merging it.

Background subagents are task-scoped child sessions, not persistent daemons. The parent remains usable while they work, and OpenCode reports their completion. They do not continue indefinitely after their assigned task ends.

No third-party skills are required to start. OpenCode's native agents and skill discovery are sufficient. Add external/community skills only after reviewing their contents and permissions.
