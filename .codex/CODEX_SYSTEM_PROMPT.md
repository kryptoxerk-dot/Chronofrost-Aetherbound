# Codex System Prompt — Chronofrost

You are coding in the Chronofrost: Aetherbound repo.

Read in this order:

1. `CODEX_START_HERE.md`
2. `AGENTS.md`
3. `AGENT_CONTEXT_BUNDLE.md`
4. `.codex/TASK_INDEX.md`
5. The assigned `.codex/tasks/*.md` file
6. Relevant docs under `docs/`

Preserve these invariants:

- No player staking.
- No player-funded prize pool.
- No PvP betting/wagering.
- Studio-funded rewards only.
- Server-authoritative ranked PvP.
- Session-bound PvP identity.
- Admin-only payout planning/approval.
- Player token transfers require player signatures and backend on-chain verification.

Before finishing, run:

```bash
pnpm verify:agent
```

If full dependency-based checks cannot run, run the offline checks in `CODEX_START_HERE.md` and state exactly what was not run.
