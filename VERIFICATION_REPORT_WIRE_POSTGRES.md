# Verification Report — Task 004: Wire Postgres Into the Running Server

Date: 2026-06-15

## Scope

Make the Postgres adapter (Task 001) the live backend when
`PVP_STORAGE_ADAPTER=postgres`, via a composition root + a node-postgres client
adapter, without rewriting PvP routes (incremental migration). Memory remains
the default for local dev/tests.

## Files changed

- `apps/server/package.json` — added `pg` dependency + `@types/pg` (dev).
- `apps/server/src/config/env.ts` — added `DATABASE_URL` (required only in postgres mode).
- `apps/server/src/pvp/adapters/pgClient.ts` — new; adapts a `pg.Pool` to the
  driver-agnostic `SqlClient` seam (query + pooled `connect` for transactions),
  plus an idempotent `migrate()` that applies the schema.
- `apps/server/src/pvp/pvpStorage.ts` — new; composition root selecting memory vs
  postgres from config/env, owning the pool lifecycle. `pg` is dynamically
  imported only in postgres mode (memory/dev path never loads the driver).
  Fails fast with `SELECT 1` on an unreachable database.
- `apps/server/src/index.ts` — initialize storage before serving; log adapter;
  close pool on shutdown (onClose hook + SIGINT/SIGTERM).
- `apps/server/src/pvp/pvpStorage.test.ts` — new; 4 tests.
- `scripts/migrate-pvp.mjs` + root `migrate:pvp` script — standalone, idempotent
  schema migration runner (`DATABASE_URL=... pnpm migrate:pvp`).

## Tests

- Default memory bundle round-trips a player; no pg handle created ✓
- Repeated init is idempotent (same bundle) ✓
- postgres mode without DATABASE_URL throws ✓
- getPvpStorage before init throws ✓

(Live-database integration is exercised by the standalone migration runner +
`SELECT 1` boot check; offline CI covers selection/lifecycle logic.)

## Commands run

```text
node scripts/agent-preflight.mjs     -> agent-preflight passed
node scripts/architecture-guard.mjs  -> architecture-guard passed
pnpm --filter @chronofrost/server typecheck -> Done
pnpm -r test                          -> 9 files / 49 tests passed (4 new)
pnpm -r build                         -> built (shared + server + client)
```

## Invariants preserved

- Public route request/response contracts unchanged (routes not yet rewired;
  storage is initialized and available for incremental adoption).
- No treasury transfer / payout execution added.
- Memory adapter behavior identical; default path does not load `pg`.

## Follow-ups

- Incrementally route PvP services through `getPvpStorage()` (prove each move
  with tests) — tracked as the remainder of Lane A1.
- Next task: `.codex/tasks/002-payout-approval-durable.md`.
