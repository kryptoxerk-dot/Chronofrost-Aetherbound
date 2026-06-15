# Chronofrost: Aetherbound

[![CI](https://github.com/kryptoxerk-dot/Chronofrost-Aetherbound/actions/workflows/ci.yml/badge.svg)](https://github.com/kryptoxerk-dot/Chronofrost-Aetherbound/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-9be7d0.svg)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
![Solana](https://img.shields.io/badge/Solana-devnet%2Fmainnet-14f195.svg)

A free-to-play, GameBoy-style pixel RPG for the browser, with **optional** Solana
`$AETHER` cosmetic purchases, server-authoritative ranked PvP, and anti-sybil
eligibility. Guest-first: you can play the whole loop without ever connecting a
wallet.

**Core invariant:** the backend never moves player tokens. Purchases use a
**quote → player-signed transfer → server verifies the confirmed transaction →
idempotent item grant** flow. No staking, no betting, no player-funded prize
pools; any PvP rewards are studio-funded and admin-gated.

## Stack

- **Client** — Vite + Phaser 3 + TypeScript. Procedural pixel art + procedural
  audio (no paid assets). Solana modules are lazy-loaded so the guest path stays
  light.
- **Server** — Fastify + TypeScript. SIWS auth, shop quote/confirm, ranked PvP,
  anti-sybil eligibility, durable Postgres storage (in-memory for dev), helmet
  security headers, and fail-fast production config validation.
- **Tooling** — pnpm workspaces, Vitest, GitHub Actions CI, architecture guard.

## Quick start

```bash
corepack enable
pnpm install
pnpm dev          # client (Vite) + server (Fastify) together
```

Open the printed Vite URL. The API defaults to `http://localhost:8787`. No wallet
or database required for local play (PvP/shop fall back to in-memory).

### Controls

```text
Move: WASD / arrow keys      Interact / confirm: E or Space
Battle: A attack  F Chronofreeze  D defend     Back: Escape
Sound: M toggles mute
```

Walk Frosthollow town, accept the Elder's quest, clear the Frostglass Cavern
(Slime → Wraith → Shrine → Golem → Chrono Warden), and open the cosmetic shop.

## Deploy

The fastest path is the included **Render Blueprint** (`render.yaml`): provisions
Postgres + API + static client and auto-wires the cross-service URLs. A portable
`apps/server/Dockerfile` covers Railway / Fly.io / Render-Docker. See
[`docs/14_DEPLOYMENT_RUNBOOK.md`](docs/14_DEPLOYMENT_RUNBOOK.md). In production the
server refuses to boot with a weak `SESSION_SECRET`.

## Project structure

```text
apps/client    Vite + Phaser browser game
apps/server    Fastify API (auth, shop, PvP, eligibility, payout approval)
packages/shared Shared types
resources/     SQL schema, env reference, checklists, balance config
docs/          PRD, design, architecture, deployment, roadmap, launch audit
scripts/       migrate-pvp, launch-readiness, launch-smoke, agent tooling
```

---


## Verification and CI

Before repackaging, pushing, or deploying, run:

```bash
pnpm verify
# or, from a fresh machine:
./scripts/verify-local.sh
```

This runs typecheck, tests, and build across the client and server workspaces. The package also includes a GitHub Actions workflow at `.github/workflows/ci.yml` so a non-compiling build or broken combat/auth/purchase guard cannot silently ship.

Second-pass additions include client combat tests, scene registry tests, game-state tests, purchase-verifier tests, order-claim idempotency tests, and CI documentation in `docs/16_CI_AND_VERIFICATION.md`.

## Recommended launch stance

You asked for **Pump.fun launch**. The package includes a Pump.fun launch plan, but the build strategy is:

```text
Playable browser demo first
→ transparent token page and community launch assets
→ Pump.fun token launch
→ token is used only for cosmetics at first
→ no token rewards until anti-cheat, analytics, legal review, and treasury controls exist
```

This lets the token support the game without turning the game into a farming target on day one.

---

## Non-negotiable rules in this fixed package

1. **Guest-first:** anyone can try the game in the browser before connecting a wallet.
2. **Devnet-first:** all game integration uses devnet/test `$AETHER` until the demo loop works.
3. **No pay-to-win:** `$AETHER` buys cosmetics first, not power or token-earning boosts.
4. **No server-side theft bug:** the server only verifies player-signed transfers; it does not transfer tokens out of player wallets.
5. **Server-authoritative rewards later:** prototype rewards are off-chain; token rewards wait until deterministic server validation exists.
6. **Pump.fun is external:** Pump.fun launches a tradable SPL-style token/bonding-curve market; it does not implement game shop logic, quest rewards, inventory, or item ownership.

---

## Build order

Start here:

1. `docs/00_MASTER_BUILD_BRIEF.md`
2. `docs/01_PRD.md`
3. `docs/04_STEP_BY_STEP_DEVELOPMENT_PLAN.md`
4. `prompts/CLAUDE_CODE_MASTER_PROMPT.md`
5. `apps/client/` and `apps/server/`


## PvP security patch status

This package now uses a safer PvP foundation:

- SIWS/session-bound PvP identity.
- No public one-shot `/pvp/match` endpoint.
- Turn-by-turn server-authoritative match lifecycle.
- Server-owned seed, side assignment, action log, HP, and result.
- Admin-only, config-backed studio-funded payout planning.
- No player staking, no player-funded pot, no PvP betting.

See:

- `docs/16_PVP_RANKED_DESIGN.md`
- `docs/17_PVP_SECURITY_PATCH_NOTES.md`
- `VERIFICATION_REPORT_PVP_SECURITY_PATCH.md`
- `resources/pvp_database_schema.sql`

## Next phase added: PvP anti-sybil eligibility

This package now includes the next safety layer for studio-funded ranked PvP rewards:

```text
GET  /pvp/me/eligibility
GET  /admin/pvp/season/:seasonId/eligibility-report
POST /admin/pvp/season/:seasonId/snapshot
POST /admin/pvp/season/:seasonId/payout-plan
POST /admin/pvp/players/:playerId/flag
POST /admin/pvp/players/:playerId/ban
POST /admin/pvp/players/:playerId/clear-flag
```

The payout planner now uses eligible season snapshot rows. Flagged, banned,
ineligible, and admin-excluded accounts do not enter automatic payout plans.
This is still a planning/execution separation: no token payouts are sent by the
API.

Read:

```text
docs/18_PVP_ELIGIBILITY_AND_ANTI_SYBIL.md
resources/pvp_database_schema.sql
```


## Phase 5: agent-ready development layer

This package now includes a dedicated layer for Claude/Codex handoffs:

```bash
pnpm agent:preflight
pnpm architecture:guard
pnpm agent:context
pnpm verify:agent
```

Key files:

```text
AGENTS.md
docs/19_AGENT_WORKFLOW_AND_CODE_OWNERSHIP.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
docs/21_PAYOUT_APPROVAL_AND_RATE_LIMITING.md
docs/api/openapi.yaml
.codex/tasks/
.claude/commands/
prompts/CODEX_PHASE_5_PROMPT.md
prompts/CLAUDE_PHASE_5_PROMPT.md
```

## Status

The Postgres PvP persistence adapter, durable payout approval, client PvP UI,
deployment scaffolding, audio/onboarding, combat balance, enemy variety, funnel
analytics, and server production hardening are all implemented and tested. See
[`docs/22_CONSOLIDATED_DEV_PLAN.md`](docs/22_CONSOLIDATED_DEV_PLAN.md) for the
current plan and the `VERIFICATION_REPORT_*.md` files for per-change evidence.
Remaining work to declare a real mainnet launch complete is operational
(deployment, official mint/treasury, legal review, playtest) and is tracked in
[`docs/24_GO_LIVE_EVIDENCE.md`](docs/24_GO_LIVE_EVIDENCE.md).

## License

[MIT](./LICENSE) — © 2026 Chronofrost: Aetherbound contributors.
