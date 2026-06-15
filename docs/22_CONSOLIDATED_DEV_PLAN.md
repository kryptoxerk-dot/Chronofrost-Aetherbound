# 22 - Consolidated Step-by-Step Development Plan

Current-state-aware plan as of **2026-06-15**. This reconciles
`04_STEP_BY_STEP_DEVELOPMENT_PLAN.md`, `11_ROADMAP.md`,
`20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md`, and the accepted mainnet prototype
launch plan with what is actually implemented in the working tree.

## Launch Target

Target: browser-playable mainnet prototype with optional fixed-price `$AETHER`
cosmetic purchases.

Launch scope:

- Free guest play with local progression.
- One town, quest NPC, shop, compact Frostglass Cavern dungeon, and boss loop.
- Optional wallet connection only for cosmetic/profile purchases.
- Durable shop order and inventory-grant storage in Postgres for production.
- PvP hidden by default for the mainnet prototype.

Not launch scope:

- Player staking.
- Player-funded prize pools.
- PvP betting or wagering.
- Token rewards, prize-claim endpoints, NFT minting, or ranked prize payouts.

## Current Status Snapshot

| Area | Status | Evidence |
|---|---|---|
| Client single-player loop | Complete for prototype | Town, NPC, dungeon, battle, HUD, shop scenes |
| Frostglass Cavern launch content | Complete for prototype | 3 enemy archetypes + Chrono Warden boss |
| Guest progression persistence | Complete | Local game state tests and dungeon/battle state |
| Optional wallet shop | Complete in repo | Quote -> player-signed transfer -> server confirm |
| Mainnet cosmetic shop durability | Complete in repo | Shop repositories, Postgres tables, inventory grants |
| Shop rollback controls | Complete | `SHOP_PURCHASES_ENABLED`, `/admin/shop/status`, smoke test |
| SIWS auth rate limits | Complete | Auth route limiter tests, repeated-429 logging, and reports |
| PvP durability track | Complete for no-prize beta foundation | Postgres repositories, write-through, payout approval persistence |
| PvP browser UI | Complete but launch-gated | `VITE_PVP_ENABLED=false` hides Arena by default |
| Wallet code-splitting | Complete | `solana/loadSolana.ts`, `codeSplitting.test.ts` |
| Deployment scaffolding | Complete in repo | `render.yaml`, Dockerfile, runbook, smoke/readiness scripts |
| Go-live external evidence | Tooling complete; evidence pending | `docs/24_GO_LIVE_EVIDENCE.md`, `go-live-evidence-check.mjs` |

## Remaining Work To Declare Real Launch Complete

The repository is a launch candidate. The real mainnet prototype launch is not
complete until these external gates are evidenced:

1. Public client and API deployment is live.
2. `/health` and CORS smoke pass against the live API.
3. Official `$AETHER` mint, treasury wallet, and treasury token account are
   pinned in production env and public disclosure.
4. A tiny mainnet cosmetic purchase dry run is completed with a real
   wallet-signed transaction.
5. Durable `shop_orders` and `shop_inventory_grants` rows are inspected for the
   dry run.
6. Legal/compliance approval is recorded for launch copy and target
   jurisdictions.
7. Five-tester playtest gate passes: 5 opened, 5 reached first battle, 3 cleared
   dungeon, 0 forced wallet connections.
8. Rollback process is tested: purchases disabled while guest game stays online.

Use:

```bash
node scripts/go-live-evidence-check.mjs path/to/go_live_evidence.json
```

## Active Lanes

### Lane A - Mainnet Prototype Launch

Status: repo-owned work complete; external evidence pending.

Next operator actions:

1. Deploy from `render.yaml` or equivalent client/API/Postgres hosts.
2. Run `node scripts/launch-readiness.mjs` with mainnet env.
3. Run `node scripts/launch-smoke.mjs` after production builds locally.
4. Fill the go-live evidence file and validate it without placeholder mode.

### Lane B - Post-Launch Patch 1

Status: deferred until after launch evidence.

Priorities:

1. Content polish from playtest feedback.
2. Onboarding clarity and audio pass.
3. Bug fixes discovered by the 5-tester gate.
4. Balance adjustments for Attack, Freeze, and Defend.

### Lane C - Post-Launch Patch 2

Status: planned.

Priorities:

1. Analytics for funnel and dungeon completion.
2. Better save/account persistence.
3. Shop admin dashboard for order inspection and inventory repair.
4. Optional Redis rate-limit adapter for multi-instance production.

### Lane D - Later No-Prize PvP Beta

Status: launch-gated.

PvP can be exposed only as a no-prize beta after operator intent is explicit:

- `VITE_PVP_ENABLED=true`
- `ALLOW_MAINNET_PVP_BETA=true` for readiness checks
- `PVP_PRIZE_POOL_RAW=0`
- No prize claim, staking, wagering, player-funded rewards, or payout endpoints

Future PvP production work:

1. WebSocket/reconnect support.
2. Abuse logging and monitoring.
3. Admin-only treasury executor for studio-funded rewards after legal review.
4. Kill switches and operational monitoring.

## Verification Standard

Every coding pass must update at least one of:

- tests proving changed behavior;
- docs explaining an intentionally unimplemented or externally gated item;
- `VERIFICATION_REPORT_*.md` with exact commands and results.

Required checks for substantial repo changes:

```bash
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
pnpm agent:context
```

If `pnpm` is unavailable, use the Node fallbacks:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```

## Progress Log

- 2026-06-15 - Postgres PvP repositories complete. See
  `VERIFICATION_REPORT_POSTGRES_REPOSITORIES.md`.
- 2026-06-15 - Postgres storage wired into the server. See
  `VERIFICATION_REPORT_WIRE_POSTGRES.md`.
- 2026-06-15 - Durable payout approval complete. See
  `VERIFICATION_REPORT_PAYOUT_APPROVAL_DURABLE.md`.
- 2026-06-15 - Client PvP UI complete and later launch-gated. See
  `VERIFICATION_REPORT_CLIENT_PVP_UI.md` and
  `VERIFICATION_REPORT_PVP_LAUNCH_GATING.md`.
- 2026-06-15 - Deployment scaffolding complete. See
  `VERIFICATION_REPORT_DEPLOY.md`.
- 2026-06-15 - Auth rate limits complete. See
  `VERIFICATION_REPORT_AUTH_RATE_LIMITS.md`.
- 2026-06-15 - Mainnet cosmetic shop hardening complete. See
  `VERIFICATION_REPORT_MAINNET_PROTOTYPE_SHOP.md`.
- 2026-06-15 - Core game content pass complete. See
  `VERIFICATION_REPORT_CORE_GAME_CONTENT.md`.
- 2026-06-15 - Launch UI polish, smoke automation, readiness gates, launch
  notice, and audit complete. See the corresponding verification reports.
- 2026-06-15 - Go-live evidence gate added. See
  `VERIFICATION_REPORT_GO_LIVE_EVIDENCE.md`.
- 2026-06-15 - Audio pass + first-run onboarding complete (procedural SFX, [M]
  mute toggle, How-to-Play overlay). See
  `VERIFICATION_REPORT_AUDIO_AND_ONBOARDING.md`.
- 2026-06-15 - Combat balance pass: Defend reworked into a tempo/resource move
  (halves the next hit AND refuels MP), completing the Attack/Freeze/Defend loop.
  See `VERIFICATION_REPORT_COMBAT_BALANCE.md`.
- 2026-06-15 - Offline dungeon funnel analytics (persisted counters + console
  handle). See commit history / `systems/analytics.ts`.
- 2026-06-15 - Enemy variety: data-driven behaviors (Wraith haste, Golem guard,
  Warden Temporal Surge) via the seeded combat model; sims stay deterministic.
  See `VERIFICATION_REPORT_ENEMY_VARIETY.md`.
- 2026-06-15 - Server production hardening: helmet security headers, sanitized
  error + JSON 404 handlers, testable buildServer() factory, body limit +
  trustProxy, and fail-fast production-secret validation. See
  `VERIFICATION_REPORT_SERVER_HARDENING.md`.
