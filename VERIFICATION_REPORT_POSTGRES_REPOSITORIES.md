# Verification Report — Task 001: Postgres PvP Repositories

Date: 2026-06-15

## Scope

Implemented the durable Postgres adapter for the PvP repository contracts so
ranked state (players, matches, action logs, rating events, eligibility
profiles/flags, season snapshots, payout plans, eligibility evaluations) can be
persisted before public ranked seasons. In-memory adapter retained for local
dev/tests. No public route behavior changed (routes still use the in-memory
ladder/eligibility singletons; the factory is the injection seam for new code).

## Files changed

- `apps/server/src/pvp/adapters/postgresRepositories.ts` — full implementation
  of all `PvpRepositories` methods against `resources/pvp_database_schema.sql`,
  with parameterized SQL, snake_case↔camelCase row mappers, and a
  transaction-safe `insertMatch` (match + action log + rating updates + Elo /
  W-L-D bookkeeping committed atomically). Driver-agnostic `SqlClient` seam with
  optional pooled `connect()` for real transactions.
- `apps/server/src/pvp/adapters/repositoryFactory.ts` — `postgres` mode now
  builds the Postgres adapter from an injected `SqlClient` (e.g. node-postgres
  Pool); `memory` remains the default.
- `apps/server/src/pvp/adapters/postgresRepositories.test.ts` — new; 9 tests
  using a statement-aware in-memory `FakeSqlClient` (no live DB needed in CI).
- `resources/pvp_database_schema.sql` — added `pvp_eligibility_evaluations`
  table (durable target for `saveEvaluation`, keyed UNIQUE by season+player).

## Test coverage (Task 001 required cases)

- Insert and retrieve ranked player ✓
- Upsert overwrite + leaderboard ordering ✓
- Insert and retrieve match with action logs ✓ (round-trips interleaved logs)
- Transactional rating + win/loss/draw bookkeeping on `insertMatch` ✓
- Draw handling (no win/loss increment) ✓
- List matches for player (ordered) ✓
- Save and retrieve latest season snapshot ✓
- Save payout plan (prize-pool extraction, `pending_review` status) ✓
- Eligibility profile round-trip with flags + identity signals + clearFlag ✓
- saveEvaluation upsert by (season, player) ✓

## Commands run

```text
node scripts/agent-preflight.mjs        -> agent-preflight passed
node scripts/architecture-guard.mjs     -> architecture-guard passed
pnpm -r typecheck                        -> all 3 projects: Done (no errors)
pnpm -r test                             -> 8 files / 45 tests passed
pnpm -r build                            -> shared + server (tsc) + client (vite) built
```

(pnpm invoked via `corepack pnpm` in this environment; Node 24.16 / pnpm 9.12.3.)

## Invariants preserved

- No player staking / wagering / entry fees; payout plans remain studio-funded,
  `pending_review`, separate from execution (no treasury transfer added).
- `savePayoutPlan` only persists a plan row; execution stays a separate,
  admin-gated, signed step (Task 002 territory).
- Public routes unchanged; postgres adapter is opt-in via `PVP_STORAGE_ADAPTER`
  + an injected client.

## Notes / follow-ups

- Production wiring: construct a node-postgres `Pool` and pass it to
  `createPvpRepositories('postgres', pool)`. The `transact()` helper uses
  `pool.connect()` for true single-connection transactions when available.
- Snapshot reads reconstruct from the lossless `snapshot_json` JSONB column;
  populating the normalized `pvp_season_snapshot_rows` analytics table can be a
  later pass.
- Next task: `.codex/tasks/002-payout-approval-durable.md`.
