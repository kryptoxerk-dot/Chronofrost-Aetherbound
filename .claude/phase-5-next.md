# /phase-5-next

Read:

```text
AGENTS.md
AGENT_CONTEXT_BUNDLE.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
```

Pick exactly one task from `.codex/tasks` and implement it. Keep the patch small.

Before final response, run:

```bash
pnpm verify:agent
```

If dependencies are unavailable, run:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```

Report exact commands and results.
