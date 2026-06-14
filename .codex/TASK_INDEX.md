# Codex Task Index

Use these tasks as small, reviewable implementation passes.

## Task 001 — Postgres PvP Repositories — ✅ DONE (2026-06-15)

File: `.codex/tasks/001-postgres-pvp-repositories.md`

Implement durable PvP repositories behind the existing repository interfaces. This is the top priority before real ranked seasons.

Implemented in `apps/server/src/pvp/adapters/postgresRepositories.ts` (+ factory wiring, `pvp_eligibility_evaluations` table, 9 adapter tests). See `VERIFICATION_REPORT_POSTGRES_REPOSITORIES.md`. Next: Task 002.

## Task 004 — Wire Postgres Into the Running Server

File: `.codex/tasks/004-wire-postgres-into-server.md`

Immediate tail of Task 001: make the Postgres adapter the live backend under `PVP_STORAGE_ADAPTER=postgres` (add `pg`, `DATABASE_URL`, migration path, incremental service injection). Recommended next step.

## Task 002 — Durable Payout Approval Workflow

File: `.codex/tasks/002-payout-approval-durable.md`

Persist payout approval requests and status transitions. Do not execute treasury transfers in this task.

## Task 003 — Client PvP UI

File: `.codex/tasks/003-client-pvp-ui.md`

Build the browser UI for queueing, active match state, actions, eligibility, and leaderboard. Do not add betting/staking/prize-claim UI.

## Suggested later tasks

- Add API rate limiting to auth/shop routes.
- Add Solana wallet code-splitting so guest play loads faster.
- Add Colyseus/WebSocket transport after turn-based REST PvP is stable.
- Add admin payout executor only after durable approval + manual review.
