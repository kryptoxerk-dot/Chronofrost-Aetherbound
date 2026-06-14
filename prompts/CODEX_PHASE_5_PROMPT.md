# Codex Phase 5 Prompt — Agent-Friendly Next Build

You are working on Chronofrost: Aetherbound.

Read first:

```text
AGENTS.md
AGENT_CONTEXT_BUNDLE.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
docs/api/openapi.yaml
```

Do not change the product invariant:

```text
No player staking.
No player-funded prize pool.
No PvP betting.
Studio-funded rewards only.
```

## Recommended task

Implement the Postgres persistence adapter behind:

```text
apps/server/src/pvp/repositories.ts
apps/server/src/pvp/adapters/postgresRepositories.ts
resources/pvp_database_schema.sql
```

Do this incrementally:

1. Add database client dependency and configuration.
2. Implement one repository at a time.
3. Add tests for each repository method.
4. Do not rewrite PvP route logic until adapter tests pass.
5. Keep memory adapter working.

## Acceptance gate

Run:

```bash
pnpm agent:preflight
pnpm architecture:guard
pnpm typecheck
pnpm test
pnpm build
```

Update `VERIFICATION_REPORT_*.md` with exact results.
