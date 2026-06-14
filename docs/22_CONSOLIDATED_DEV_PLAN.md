# 22 — Consolidated Step-by-Step Development Plan

Current-state-aware plan as of **2026-06-15**. Reconciles `04_STEP_BY_STEP_DEVELOPMENT_PLAN.md`,
`11_ROADMAP.md`, `20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md`, and `.codex/TASK_INDEX.md`
with what is actually implemented in the working tree.

## Status snapshot

| Area | Status |
|---|---|
| Client single-player loop (town, NPC, Chronofrost battle w/ Freeze+MP+crit, dungeon, shop, wallet HUD) | Built (ahead of the codex zip) |
| Server PvP engine (duel engine, matchmaking, ladder/Elo, eligibility/anti-sybil, season, payout approval) | Built — in-memory |
| Solana devnet quote→sign→confirm purchase verifier | Built + tested |
| Rate limiting, SIWS auth scaffold | Built |
| PvP persistence (Postgres adapter) | **Done (Task 001)** — implemented + tested, not yet wired into routes |
| PvP browser UI (`pvpApi.ts`, PvP scenes) | Missing in working tree |
| Durable payout approval, treasury executor | Approval in-memory; no executor |
| Deploy / public demo | Not done |

Two parallel lanes: **A** = PvP ranked durability (active codex track), **B** =
player-facing demo + deploy. **C** = cross-cutting hardening (continuous).

---

## Lane A — PvP ranked durability (active track)

### A1 — Wire the Postgres adapter into the running server  → `.codex/tasks/004`
- Add `pg` dependency + `DATABASE_URL` env; build a `Pool`, pass to `createPvpRepositories('postgres', pool)`.
- Add a migration runner or documented `psql -f resources/pvp_database_schema.sql`.
- Incrementally route PvP services through the repository bundle; no big-bang route rewrite.
- **Accept:** ratings / matches / action logs / snapshots survive a server restart.

### A2 — Durable payout approval  → `.codex/tasks/002`
- Move payout-approval records to Postgres; persist status transitions.
- Snapshot required before approval; planning ≠ approval ≠ execution; unique tx-signature guard.
- **No auto-transfer.** **Accept:** approval records durable; double-execution impossible.

### A3 — Client PvP UI  → `.codex/tasks/003` (reconcile first)
- Restore/recreate `apps/client/src/services/pvpApi.ts` against current server routes.
- PvP menu → queue → active-match (poll) → turn-timer → eligibility panel → leaderboard.
- **No** prize-claim / staking / betting UI; wallet optional until ranked actions need auth.

### A4 — Treasury executor (gated, after A2)
- Admin-gated executor signing transfers **only** from studio treasury; verify each payout
  on-chain; record signatures.

---

## Lane B — Public playable demo + deploy

### B1 — Single-player progression persistence (quest/inventory/save).
### B2 — Content & balance pass — 10-room dungeon, 3 enemies + 1 boss, balance tuning.
### B3 — Wallet code-splitting (Phase 5E) — lazy-load Solana modules so the guest
movement/combat path stays off the ~1.77 MB Solana bundle (build warns on chunk size).
### B4 — Deploy — client to Vercel/Netlify, server to Railway/Fly/Render; run the
5-tester playtest checklist from `04`.

---

## Lane C — Cross-cutting hardening (continuous)
- Rate-limit SIWS nonce/verify routes; log repeated 429s (Phase 5B).
- Optional Redis limiter adapter for multi-instance later.
- Keep `pnpm verify:agent` + architecture guard green; one verification report per change.

---

## Definition of done (every step)

```text
pnpm verify:agent passes
architecture guard passes
new tests cover the changed behavior
docs/prompts updated
no player-funded / wagering / staking path introduced
```

## Progress log
- 2026-06-15 — Task 001 (Postgres PvP repositories) complete. See
  `VERIFICATION_REPORT_POSTGRES_REPOSITORIES.md`.
- 2026-06-15 — Task 004 (wire Postgres into server) complete: `pgClient.ts`,
  `pvpStorage.ts` composition root, `index.ts` lifecycle, `scripts/migrate-pvp.mjs`.
  See `VERIFICATION_REPORT_WIRE_POSTGRES.md`. Remaining A1 tail: route services
  through `getPvpStorage()` incrementally.
