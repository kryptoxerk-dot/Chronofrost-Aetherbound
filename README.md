# CHRONOFROST: AETHERBOUND — Fixed Build Package

**Format:** simple GameBoy-style pixel RPG for PC browsers.  
**Web3 layer:** Solana wallet connection, devnet `$AETHER` testing, and a guarded Pump.fun launch plan.  
**Primary correction:** the backend must never pretend it can move player tokens without the player signing. Purchases now use a **quote → player-signed transfer → backend verifies confirmed transaction → idempotent item grant** flow.

---

## What this package contains

| Path | Purpose |
|---|---|
| `apps/client/` | Browser game starter built with Vite + Phaser 3 + TypeScript. Uses generated placeholder GameBoy-style shapes so the game can run without paid assets. |
| `apps/server/` | Fastify backend starter for health, auth nonce, shop quote, shop confirm, and inventory. Uses in-memory storage for prototype; docs include Postgres schema. |
| `scripts/create-devnet-aether.ts` | Helper script plan for minting a devnet SPL token used as test `$AETHER`. |
| `docs/` | Fixed PRD, game design document, architecture, 7-day sprint, 30-day plan, Pump.fun launch plan, tokenomics, security, monetization, roadmap, QA, deployment. |
| `prompts/` | Updated Claude/Codex prompts that include the corrected Web3 purchase flow and scope controls. |
| `resources/` | Folder structure, DB schema, env vars, launch checklists, asset checklist, balancing config. |

---

## Fast local start

```bash
cd chronofrost-aetherbound-fixed
pnpm install
pnpm dev
```

Then open the Vite client URL. The backend defaults to `http://localhost:8787`.

### Game controls

```text
Move: WASD or arrow keys
Interact / confirm: E or Space
Battle attack: A
Battle freeze: F
Battle defend: D
Back / return: Escape
```

The browser demo is intentionally simple: the player can walk around town, accept a quest, enter a short dungeon, fight enemies with a Chronofrost time mechanic, earn off-chain gold, and open the shop. Wallet and `$AETHER` are optional.

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

The next recommended coding task is the Postgres PvP persistence adapter. Use the repository contracts in `apps/server/src/pvp/repositories.ts` and the scaffold in `apps/server/src/pvp/adapters/postgresRepositories.ts`.
