# Chronofrost Agent Context Bundle

Generated at 2026-06-15T05:28:59.336Z



---

## AGENTS.md

```md
# Chronofrost Agent Instructions

This repo is built for coding-agent handoffs. Follow this file before editing code.

## Product invariant

Chronofrost is a free-to-try browser GameBoy-style RPG with optional `$AETHER` cosmetic purchases and studio-funded ranked season rewards.

Non-negotiable rules:

- No player staking.
- No player-funded prize pool.
- No PvP betting or wagering.
- No entry fee that feeds rewards.
- PvP prizes, if used, are funded only by the studio treasury.
- `$AETHER` early utility is cosmetics, profile identity, founder items, and optional community access.
- The backend never moves tokens from a player wallet without the player signing a transaction.

## Commands

Use these from repo root:

```bash
pnpm install --frozen-lockfile
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
pnpm agent:context
```

When dependencies are unavailable, still run:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```

## Main architecture

- Browser client: `apps/client`
- Server API: `apps/server`
- Shared dependency-free contracts: `packages/shared`
- PvP server authority: `apps/server/src/pvp`
- Auth/SIWS session: `apps/server/src/auth`
- Solana purchase verification: `apps/server/src/solana`
- Agent task docs: `.codex/tasks`, `.claude/commands`, `prompts`

## Safe edit boundaries

Preferred next edits:

1. Implement Postgres repository adapter behind `apps/server/src/pvp/repositories.ts`.
2. Add durable payout approval tables and routes.
3. Add signed treasury payout executor after approval/preflight.
4. Add client PvP UI using `apps/client/src/services/pvpApi.ts`.
5. Code-split Solana wallet imports so guest play loads fast.

Do not reintroduce:

- `POST /pvp/match` one-shot endpoint.
- Client-supplied `p1`, `p2`, winner, prize pool, or distribution.
- Public payout endpoints.
- Any direct player-to-player token transfer for PvP outcomes.

## PR/patch standard

Every coding pass must update one of:

- tests proving the changed behavior;
- docs explaining an intentionally unimplemented stub;
- `VERIFICATION_REPORT_*.md` with exact commands and results.

Keep changes small enough that another agent can review with a normal diff.
```


---

## README.md

```md
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
```


---

## docs/00_MASTER_BUILD_BRIEF.md

```md
# 00 — Master Build Brief

## Objective

Build **Chronofrost: Aetherbound**, a simple GameBoy-style pixel RPG that runs in a PC browser and is easy for anyone to try. The first public version should be a **5-minute playable demo**, not a complex Web3 product.

The Web3 layer should support:

```text
optional Solana wallet connect
optional devnet $AETHER balance display
devnet cosmetic purchase flow
Pump.fun launch plan for the real $AETHER token
```

## Core product promise

> A retro browser RPG where players manipulate frozen time, clear short dungeons, and optionally use `$AETHER` for cosmetic identity and community access.

## Target first demo experience

```text
Minute 0–1: Player opens browser, sees title screen, enters town.
Minute 1–2: Player talks to NPC and accepts first quest.
Minute 2–4: Player enters dungeon and fights enemies.
Minute 4–5: Player beats the Chrono Warden boss, earns gold, returns to town.
Optional: player connects Solana wallet and tests devnet cosmetic shop.
```

## Major product decisions

### 1. Browser-first, not wallet-first

Players must be able to start without wallet setup. Wallet connect appears after the player has experienced the game.

### 2. Game first, token second

The Pump.fun token can help community formation, but the game must not depend on token speculation. The game should still be fun if the player never buys the token.

### 3. `$AETHER` is not the normal reward currency

Use off-chain `Gold` or `Frost Shards` for normal progression. Use `$AETHER` first for cosmetic shop purchases only.

### 4. No pay-to-win

Do not sell XP boosters, paid dungeon keys, paid loot boxes, stat boosts, or token-earning advantages in the first release.

### 5. Correct purchase security

The backend verifies transactions. It does not take tokens from players. The player signs the transfer from their own wallet.

## First sellable version

The first monetizable version is not “token farming.” It is:

```text
Free browser demo
+ Founder cosmetic pack
+ Discord/community access
+ optional $AETHER cosmetic shop
```

## Success criteria for milestone 1

```text
Playable in browser with no install
Runs at stable FPS on average laptops
Guest mode works
One dungeon clear works
One boss works
One shop item works in off-chain mode
Devnet wallet balance can be displayed
Devnet purchase quote-confirm flow works
No private keys in client
```
```


---

## docs/16_PVP_RANKED_DESIGN.md

```md
# 16 — Ranked PvP: skill-based, session-bound, studio-funded prizes

## What this is

Chronofrost PvP is a 1v1 ranked duel mode using the Chronofrost combat actions:

- `attack`
- `freeze`
- `defend`

Players climb an Elo ladder. At season end, top finishers may receive `$AETHER`
from a **studio-funded** prize pool.

## What this is NOT

- Not player-vs-player wagering.
- Not token staking.
- Not a player-funded pot.
- Not an entry-fee prize pool.
- Not a gambling/betting feature.

Players never stake tokens against each other. The pool is funded only by the
studio treasury.

## Security model

PvP identity is bound to Sign-In With Solana session state:

- The authenticated wallet is the player ID.
- The client cannot choose `p1.id` or `p2.id`.
- The client cannot submit both players' action queues.
- The server owns match seed, side assignment, turn order, HP, action log, and
  result.

## Current lifecycle endpoints

- `POST /pvp/queue`
- `GET /pvp/me/active-match`
- `GET /pvp/matches/:matchId/state`
- `POST /pvp/matches/:matchId/action`
- `POST /pvp/matches/:matchId/forfeit`
- `POST /pvp/matches/:matchId/claim-timeout`
- `GET /pvp/matches/:matchId/verify`
- `GET /pvp/leaderboard`
- `GET /pvp/player/:id`

The old unsafe `POST /pvp/match` endpoint has been removed.

## Turn rules

- Only match participants can read/act in the match.
- Only the current-turn player can submit an action.
- Repeated requests from the wrong player are rejected.
- Actions after completion are rejected.
- A stale current player can lose by timeout claim.

## Combat balance patch

The previous PvP engine had two major balance flaws:

1. `defend` did not actually reduce damage.
2. `freeze` was too dominant as a spam action.

The patched engine now makes `defend` a real defensive choice: it reduces the
next incoming hit and ripostes predictable attack spam. `freeze` keeps the
Chronofrost identity but has lower damage, longer self-recovery, and reduced
impact against guard.

## Studio-funded season payouts

The payout-plan endpoint is admin-only:

`POST /admin/pvp/season/payout-plan`

The request body no longer accepts `prizePoolRaw` or `distribution`. Those values
come from server-side env/DB config:

- `PVP_SEASON_ID`
- `PVP_PRIZE_POOL_RAW`
- `PVP_PRIZE_DISTRIBUTION`
- `PVP_TOKEN_DECIMALS`
- `PVP_ADMIN_TOKEN`

The endpoint only creates a payout plan. It does not move funds.

## Required before public prizes

Before paying real `$AETHER` rewards:

1. Replace in-memory ladder/match storage with Postgres.
2. Add rate limits and abuse detection.
3. Add anti-sybil rules for season eligibility.
4. Freeze season snapshots before payout planning.
5. Require admin approval for payout plans.
6. Execute treasury transfers through a separate signed operation.
7. Review target-market legal/compliance requirements.

## Invariant

Keep this invariant permanently:

```text
No player staking.
No player-funded prize pot.
No token betting.
No entry fee that feeds rewards.
Studio-funded season rewards only.
```

## Phase 2 update — eligibility before payout

The ranked ladder now has an eligibility gate for studio-funded rewards. The
leaderboard alone is not enough to receive rewards. At season end, the server
creates an eligibility snapshot and payout plans use only players with status
`eligible`.

Excluded from automatic payout plans:

```text
ineligible accounts
flagged_review accounts
banned accounts
admin_excluded accounts
test wallets
```

This prevents obvious wallet farming and collusion from going straight from
leaderboard rank to treasury payout.
```


---

## docs/18_PVP_ELIGIBILITY_AND_ANTI_SYBIL.md

```md
# 18 — PvP Eligibility and Anti-Sybil Layer

## Objective

Protect studio-funded `$AETHER` ranked season rewards from cheap wallet farming,
collusion, fake matches, forfeits, and low-quality leaderboard manipulation.

This layer keeps the core product model intact:

```text
free ranked PvP
studio-funded season rewards
no player staking
no player-funded prize pool
no PvP betting
```

## What changed in this phase

Added server-side eligibility logic:

```text
apps/server/src/pvp/eligibility.ts
apps/server/src/pvp/eligibility.test.ts
apps/server/src/pvp/repositories.ts
```

Updated payout planning so admin payout plans use an eligible season snapshot,
not the raw leaderboard.

## Eligibility statuses

```text
eligible        = can enter automatic payout candidate list
ineligible      = lacks minimum activity/diversity requirements
flagged_review  = activity qualifies, but suspicious signals require admin review
banned          = excluded by admin/abuse policy
admin_excluded  = test wallet, admin wallet, or manually excluded wallet
```

Only `eligible` players enter automatic payout plans.

## MVP eligibility rules

Recommended public-season defaults:

```text
Minimum account age: 7 days
Minimum completed ranked matches: 30
Minimum unique opponents: 10
Repeated-opponent cap: first 3 matches count fully
Forfeit/timeout rate cap: 20%
Short-match rate cap: 35%
Identity cluster threshold: 3 wallets per strong signal
```

These are configurable through server env.

## Anti-sybil signals

The system evaluates:

```text
completed ranked matches
unique opponents
repeated opponent concentration
forfeit / timeout rate
ultra-short match rate
win/loss diversity
active admin flags
banned/admin/test wallet status
salted IP/device/user-agent hash clusters when enabled
```

A suspicious signal does not automatically confiscate rewards. It moves the
player to `flagged_review`, which means a human should inspect the account
before payout approval.

## Privacy rule

If identity-signal collection is enabled, only salted hashes are stored:

```text
ipHash
deviceHash
userAgentHash
```

Do not store raw IP addresses, raw device fingerprints, or raw user-agent data
in normal match records. The config switch defaults to disabled.

## Admin routes

```text
GET  /admin/pvp/season/:seasonId/eligibility-report
POST /admin/pvp/season/:seasonId/snapshot
POST /admin/pvp/season/:seasonId/payout-plan
POST /admin/pvp/players/:playerId/flag
POST /admin/pvp/players/:playerId/ban
POST /admin/pvp/players/:playerId/clear-flag
```

All admin routes require:

```text
x-admin-token: <PVP_ADMIN_TOKEN>
```

Optional audit actor header:

```text
x-admin-actor: <operator-name>
```

## Player route

```text
GET /pvp/me/eligibility
```

Requires SIWS session bearer token. Returns the player’s current eligibility
status and reasons without exposing private fingerprint hashes.

## Payout flow after this phase

```text
1. Season ends.
2. Admin creates snapshot.
3. Eligibility engine classifies every ranked player.
4. Flagged/ineligible/banned/admin-excluded wallets are excluded from automatic payout candidates.
5. Admin payout plan uses eligible snapshot players only.
6. Separate future treasury executor signs and sends payouts after manual approval.
```

## Still not built

This phase does not send tokens. It does not replace in-memory stores with
Postgres. It does not add live WebSocket matchmaking.

Production blockers before real `$AETHER` prize payouts:

```text
Postgres adapter for repository interfaces
rate limiting
manual payout approval workflow
signed treasury payout executor
monitoring/alerts
legal/compliance review for target markets
```
```


---

## docs/19_AGENT_WORKFLOW_AND_CODE_OWNERSHIP.md

```md
# Agent Workflow and Code Ownership

## Objective

Make Claude Code, Codex, or another coding agent productive without needing to rediscover the project rules each session.

This phase adds:

- root `AGENTS.md` instructions;
- architecture guard scripts;
- context bundle generation;
- phase-specific prompts;
- API contract documentation;
- repository adapter scaffolding;
- rate-limit scaffolding;
- payout approval/preflight scaffolding.

## How an agent should start

```bash
pnpm install --frozen-lockfile
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
pnpm agent:context
```

Then read:

```text
AGENTS.md
AGENT_CONTEXT_BUNDLE.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
docs/api/openapi.yaml
```

## Ownership map

| Area | Files | Owner role |
|---|---|---|
| Game client | `apps/client/src/scenes`, `apps/client/src/systems` | Phaser/browser engineer |
| Web3 shop | `apps/client/src/solana`, `apps/server/src/routes/shop.ts`, `apps/server/src/solana` | Solana engineer |
| Auth | `apps/server/src/routes/auth.ts`, `apps/server/src/auth` | Backend/security engineer |
| PvP lifecycle | `apps/server/src/pvp/matchmaking.ts`, `apps/server/src/routes/pvp.ts` | Backend/game systems engineer |
| Anti-sybil | `apps/server/src/pvp/eligibility.ts` | Risk/abuse systems engineer |
| Payout approval | `apps/server/src/pvp/payoutApproval.ts`, `apps/server/src/pvp/treasuryPayoutPreflight.ts` | Backend/ops engineer |
| Persistence | `apps/server/src/pvp/repositories.ts`, `apps/server/src/pvp/adapters` | Backend/database engineer |
| Agent workflow | `AGENTS.md`, `prompts`, `.codex`, `.claude`, `scripts` | Technical lead |

## Required invariants for future agents

1. Player identity must come from SIWS session, not request body.
2. Server owns PvP match seed, side assignment, turn order, state, and winner.
3. Public requests cannot set prize pool, distribution, payout candidates, or winner.
4. Payout planning, approval, and execution are separate phases.
5. In-memory storage is for local/dev only; real seasons require Postgres.
6. Fingerprinting hooks must store salted hashes only, never raw IP/device data.
7. Pump.fun token utility must not be marketed as profit, yield, or betting.

## Verification standard

Preferred green gate:

```bash
pnpm verify:agent
```

Minimum offline gate:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```
```


---

## docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md

```md
# Next Phase Implementation Backlog

This is the prioritized task plan for Claude/Codex.

## Phase 5A — Postgres persistence adapter

Objective: replace in-memory PvP state before public ranked seasons.

Files:

```text
resources/pvp_database_schema.sql
apps/server/src/pvp/repositories.ts
apps/server/src/pvp/adapters/postgresRepositories.ts
apps/server/src/pvp/adapters/repositoryFactory.ts
```

Tasks:

1. Add a real Postgres client dependency only after deciding hosting target.
2. Implement `createPostgresPvpRepositories(client)` against the SQL schema.
3. Add migration runner or documented migration command.
4. Add repository integration tests using a test database or transaction rollback.
5. Wire repository injection into services incrementally; do not big-bang rewrite PvP routes.

Acceptance tests:

```text
ratings survive server restart
matches survive server restart
action logs are durable
season snapshots are immutable after creation
payout approval records are durable
```

## Phase 5B — Rate limiting and abuse controls

Objective: reduce queue/action/admin abuse before public tests.

Current scaffold:

```text
apps/server/src/security/rateLimit.ts
apps/server/src/security/rateLimit.test.ts
```

Tasks:

1. Keep in-memory limiter for local dev.
2. Add edge/CDN limits in deployment docs.
3. Add optional Redis adapter later for multi-instance deployments.
4. Rate-limit SIWS nonce/verify routes too.
5. Add logging for repeated 429s from same wallet/IP hash.

## Phase 5C — Admin payout approval workflow

Objective: prevent automatic treasury draining.

Current scaffold:

```text
apps/server/src/pvp/payoutApproval.ts
apps/server/src/pvp/treasuryPayoutPreflight.ts
```

Tasks:

1. Make payout approval records durable in Postgres.
2. Require season snapshot before creating approval request.
3. Require human/admin approval before treasury execution.
4. Create a separate treasury executor that signs transfers only from studio treasury.
5. Verify each payout transaction on-chain and record tx signatures.

## Phase 5D — Client PvP UI

Objective: make ranked PvP playable from the browser.

Files:

```text
apps/client/src/services/pvpApi.ts
apps/client/src/scenes
```

Tasks:

1. Add PvP menu in town.
2. Add queue screen.
3. Add match state polling or WebSocket placeholder.
4. Add turn timer UI.
5. Add eligibility status panel.
6. Add leaderboard screen.

Do not build token prize claim UI until treasury payout workflow is implemented.

## Phase 5E — Wallet code-splitting

Objective: keep guest load fast.

Tasks:

1. Lazy-load wallet/Solana modules only when player opens shop or connects wallet.
2. Keep guest movement/combat path free of Solana bundle cost.
3. Verify Vite bundle chunk sizes.

## Definition of done

A phase is complete only when:

```text
pnpm verify:agent passes
architecture guard passes
new tests cover the changed behavior
docs/prompts are updated
no unsafe PvP betting path is introduced
```
```


---

## docs/21_PAYOUT_APPROVAL_AND_RATE_LIMITING.md

```md
# Payout Approval and Rate Limiting

## Objective

This phase adds guardrails around the two next-risky areas:

1. abusive calls to PvP/admin endpoints;
2. accidental payout execution from a leaderboard without review.

## Rate limiting

A dependency-free fixed-window limiter now exists at:

```text
apps/server/src/security/rateLimit.ts
```

PvP routes use separate limits for:

```text
pvp.queue
pvp.action
pvp.admin
```

Environment variables:

```text
PVP_QUEUE_RATE_LIMIT_MAX
PVP_QUEUE_RATE_LIMIT_WINDOW_MS
PVP_ACTION_RATE_LIMIT_MAX
PVP_ACTION_RATE_LIMIT_WINDOW_MS
PVP_ADMIN_RATE_LIMIT_MAX
PVP_ADMIN_RATE_LIMIT_WINDOW_MS
```

This is a local/dev safety layer. Production should also add CDN/WAF/edge limits and later a Redis-backed limiter for multi-instance deployments.

## Payout approval workflow

The reward flow is now staged:

```text
season snapshot
→ eligibility-filtered payout plan
→ payout approval request
→ admin approval/rejection
→ treasury preflight
→ separate signed treasury execution later
→ record execution tx signature
```

Current files:

```text
apps/server/src/pvp/payoutApproval.ts
apps/server/src/pvp/treasuryPayoutPreflight.ts
```

Admin endpoints:

```text
POST /admin/pvp/season/:seasonId/payout-approval-request
GET  /admin/pvp/payout-requests
GET  /admin/pvp/payout-requests/:requestId
POST /admin/pvp/payout-requests/:requestId/approve
POST /admin/pvp/payout-requests/:requestId/reject
POST /admin/pvp/payout-requests/:requestId/cancel
GET  /admin/pvp/payout-requests/:requestId/preflight
POST /admin/pvp/payout-requests/:requestId/record-execution
```

Important: `record-execution` only records a tx signature after preflight. It does not sign or send tokens.

## Treasury execution rule

The future executor must satisfy all of these before sending `$AETHER`:

```text
approved payout request
not already executed
studio-funded plan only
eligible-season-snapshot source
no duplicate recipients
total payout <= configured prize pool
operator approval recorded
on-chain tx verified after send
```

## Still not production-ready

Before real prizes:

```text
Postgres adapter
admin audit log
manual review UI
separate signer/treasury wallet policy
on-chain payout verifier
legal/compliance review
```
```


---

## docs/api/openapi.yaml

```yaml
openapi: 3.0.3
info:
  title: Chronofrost Aetherbound API
  version: 0.2.0-agent-phase
  description: >
    Browser RPG + optional Solana cosmetic purchases + server-authoritative PvP.
    PvP prizes are studio-funded only. This contract exists to make coding-agent
    client/server work less ambiguous.
servers:
  - url: http://localhost:8787
security:
  - SessionToken: []
components:
  securitySchemes:
    SessionToken:
      type: apiKey
      in: header
      name: authorization
      description: Bearer session token returned by SIWS auth verify.
    AdminToken:
      type: apiKey
      in: header
      name: x-admin-token
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error: { type: string }
    PvpAction:
      type: string
      enum: [attack, freeze, defend]
    QueueResult:
      oneOf:
        - type: object
          required: [status, playerId]
          properties:
            status: { type: string, enum: [queued] }
            playerId: { type: string }
        - type: object
          required: [status, match]
          properties:
            status: { type: string, enum: [matched] }
            match: { $ref: '#/components/schemas/PublicMatchState' }
    PublicMatchState:
      type: object
      required: [matchId, status, viewerId, currentTurnPlayerId, yourTurn, winnerId]
      properties:
        matchId: { type: string, format: uuid }
        status: { type: string, enum: [active, complete] }
        viewerId: { type: string }
        currentTurnPlayerId:
          type: string
          nullable: true
        yourTurn: { type: boolean }
        turnDeadlineAt:
          type: string
          nullable: true
        winnerId:
          type: string
          nullable: true
    EligibilityEvaluation:
      type: object
      properties:
        playerId: { type: string }
        status:
          type: string
          enum: [eligible, ineligible, flagged_review, banned, admin_excluded]
        eligible: { type: boolean }
        reasons:
          type: array
          items: { type: string }
        warnings:
          type: array
          items: { type: string }
    PayoutApprovalRequest:
      type: object
      properties:
        requestId: { type: string, format: uuid }
        seasonId: { type: string }
        status:
          type: string
          enum: [pending_review, approved, rejected, cancelled]
        createdBy: { type: string }
        approvedBy: { type: string }
        executionTxSignature: { type: string }
paths:
  /health:
    get:
      security: []
      responses:
        '200': { description: OK }
  /shop/items:
    get:
      security: []
      summary: List active cosmetic shop items.
      responses:
        '200': { description: Active fixed-price cosmetic items }
  /shop/quote:
    post:
      security: []
      summary: Create a server-side cosmetic purchase order.
      description: Returns transfer parameters for a player-signed SPL transfer. No backend token movement.
      responses:
        '200': { description: Purchase quote/order }
        '400': { description: Invalid wallet, item, or config }
        '503': { description: Solana config missing or purchases disabled }
  /shop/confirm:
    post:
      security: []
      summary: Verify a player-signed transfer and grant the cosmetic once.
      responses:
        '200': { description: Cosmetic granted }
        '400': { description: Transaction verification failed }
        '409': { description: Duplicate tx or non-pending order }
        '410': { description: Order expired }
  /inventory/{wallet}:
    get:
      security: []
      parameters:
        - in: path
          name: wallet
          required: true
          schema: { type: string }
      responses:
        '200': { description: Cosmetic inventory grants for wallet }
  /admin/shop/status:
    get:
      security: [{ AdminToken: [] }]
      summary: Read cosmetic purchase availability.
      responses:
        '200': { description: Shop status }
        '401': { description: Missing admin token }
    post:
      security: [{ AdminToken: [] }]
      summary: Enable or disable cosmetic purchases without taking the game offline.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [purchasesEnabled]
              properties:
                purchasesEnabled: { type: boolean }
                reason: { type: string, maxLength: 240 }
      responses:
        '200': { description: Updated shop status }
        '401': { description: Missing admin token }
  /pvp/queue:
    post:
      summary: Join ranked PvP queue.
      description: Player identity comes from SIWS session. Client cannot choose p1/p2.
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, maxLength: 40 }
      responses:
        '200':
          description: Queued or matched.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/QueueResult' }
        '401': { description: Missing session }
        '429': { description: Rate limited }
  /pvp/me/active-match:
    get:
      responses:
        '200': { description: Active match or none }
  /pvp/me/eligibility:
    get:
      responses:
        '200':
          description: Player prize eligibility evaluation.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/EligibilityEvaluation' }
  /pvp/matches/{matchId}/state:
    get:
      parameters:
        - in: path
          name: matchId
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Participant-visible match state.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PublicMatchState' }
        '404': { description: Match not found or not participant }
  /pvp/matches/{matchId}/action:
    post:
      parameters:
        - in: path
          name: matchId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action: { $ref: '#/components/schemas/PvpAction' }
      responses:
        '200': { description: Updated match state }
        '403': { description: Not a match participant }
        '409': { description: Wrong turn or complete match }
        '429': { description: Rate limited }
  /pvp/matches/{matchId}/forfeit:
    post:
      parameters:
        - in: path
          name: matchId
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: Forfeit recorded }
  /pvp/matches/{matchId}/claim-timeout:
    post:
      parameters:
        - in: path
          name: matchId
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: Timeout claim recorded }
  /pvp/leaderboard:
    get:
      security: []
      parameters:
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 100 }
      responses:
        '200': { description: Ranked ladder }
  /admin/pvp/season/{seasonId}/snapshot:
    post:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: seasonId
          required: true
          schema: { type: string }
      responses:
        '200': { description: Season snapshot }
        '401': { description: Missing admin token }
  /admin/pvp/season/{seasonId}/payout-approval-request:
    post:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: seasonId
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Pending payout approval request.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PayoutApprovalRequest' }
  /admin/pvp/payout-requests:
    get:
      security: [{ AdminToken: [] }]
      responses:
        '200': { description: Payout approval requests }
  /admin/pvp/payout-requests/{requestId}/approve:
    post:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: requestId
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: Request approved }
  /admin/pvp/payout-requests/{requestId}/reject:
    post:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: requestId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reason]
              properties:
                reason: { type: string }
      responses:
        '200': { description: Request rejected }
  /admin/pvp/payout-requests/{requestId}/preflight:
    get:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: requestId
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { description: Treasury preflight result }
  /admin/pvp/payout-requests/{requestId}/record-execution:
    post:
      security: [{ AdminToken: [] }]
      parameters:
        - in: path
          name: requestId
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [txSignature]
              properties:
                txSignature: { type: string }
      responses:
        '200': { description: Execution signature recorded }
```


---

## resources/environment_variables.md

```md
# Environment Variables

## Client

```text
VITE_API_BASE_URL=http://localhost:8787
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_AETHER_MINT=<devnet mint>
VITE_TREASURY_TOKEN_ACCOUNT=<treasury ATA>
```

## Server

```text
SERVER_PORT=8787
CORS_ORIGIN=http://localhost:5173
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
AETHER_MINT=<devnet mint>
TREASURY_WALLET=<treasury wallet public key>
TREASURY_TOKEN_ACCOUNT=<treasury ATA>
SESSION_SECRET=<random secret>
DATABASE_URL=<postgres later>
```

## Never expose

```text
private keys
seed phrases
mainnet treasury keypairs
RPC admin credentials
database passwords in frontend env
```

## PvP eligibility / anti-sybil variables

```text
PVP_SEASON_CUTOFF_AT=9999-12-31T00:00:00.000Z
PVP_MIN_ACCOUNT_AGE_DAYS=7
PVP_MIN_COMPLETED_MATCHES=30
PVP_MIN_UNIQUE_OPPONENTS=10
PVP_MAX_COUNTED_MATCHES_PER_OPPONENT=3
PVP_MAX_FORFEIT_RATE=0.2
PVP_SHORT_MATCH_MAX_ACTIONS=3
PVP_MAX_SHORT_MATCH_RATE=0.35
PVP_MAX_IDENTITY_CLUSTER_SIZE=3
PVP_FINGERPRINTING_ENABLED=false
PVP_FINGERPRINT_SALT=<random-secret-salt>
PVP_TEST_WALLET_PREFIXES=test-,dev-,wallet-route-
PVP_ADMIN_EXCLUDED_WALLETS=<comma-separated-wallets>
```

Privacy rule: if fingerprinting is enabled, the server stores salted hashes only. Do not store raw IP addresses or raw device fingerprints in normal PvP records.

## Phase 5 / agent-friendly next build

| Variable | Default | Purpose |
|---|---:|---|
| `PVP_STORAGE_ADAPTER` | `memory` | Future switch for `memory` vs `postgres` PvP repositories. Postgres is scaffolded but not implemented yet. |
| `PVP_QUEUE_RATE_LIMIT_MAX` | `12` | Max queue requests per wallet per window. |
| `PVP_QUEUE_RATE_LIMIT_WINDOW_MS` | `60000` | Queue rate-limit window. |
| `PVP_ACTION_RATE_LIMIT_MAX` | `60` | Max action/forfeit/timeout requests per wallet per window. |
| `PVP_ACTION_RATE_LIMIT_WINDOW_MS` | `60000` | PvP action rate-limit window. |
| `PVP_ADMIN_RATE_LIMIT_MAX` | `60` | Max admin endpoint requests per admin key/IP per window. |
| `PVP_ADMIN_RATE_LIMIT_WINDOW_MS` | `60000` | Admin rate-limit window. |

Production should also use edge/CDN limits and durable rate-limit storage if the API runs on more than one server instance.
```


---

## resources/pvp_database_schema.sql

```sql
-- Chronofrost PvP persistence target schema.
-- The current package keeps PvP in memory for local development only. Before
-- public ranked seasons or studio-funded $AETHER prizes, replace the in-memory
-- adapters with Postgres tables equivalent to these.
--
-- Invariant: ranked rewards are studio-funded only. No table below records a
-- player stake, player entry fee, or player-funded prize pot.

CREATE TABLE IF NOT EXISTS pvp_players (
  player_id TEXT PRIMARY KEY,              -- SIWS-verified wallet address
  display_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  wallet_authenticated BOOLEAN NOT NULL DEFAULT TRUE,
  eligibility_status TEXT NOT NULL DEFAULT 'ineligible'
    CHECK (eligibility_status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  admin_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pvp_player_identity_signals (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  -- Salted hashes only. Do not store raw IP/device/user-agent values here.
  ip_hash TEXT,
  device_hash TEXT,
  user_agent_hash TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ip_hash IS NOT NULL OR device_hash IS NOT NULL OR user_agent_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pvp_identity_ip_hash ON pvp_player_identity_signals(ip_hash) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pvp_identity_device_hash ON pvp_player_identity_signals(device_hash) WHERE device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pvp_identity_ua_hash ON pvp_player_identity_signals(user_agent_hash) WHERE user_agent_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS pvp_player_flags (
  flag_id UUID PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_by TEXT,
  cleared_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pvp_flags_active ON pvp_player_flags(player_id) WHERE cleared_at IS NULL;

CREATE TABLE IF NOT EXISTS pvp_seasons (
  season_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'snapshot', 'paid', 'cancelled')),
  prize_pool_raw NUMERIC(78, 0) NOT NULL DEFAULT 0,
  token_decimals INTEGER NOT NULL DEFAULT 6,
  distribution_json JSONB NOT NULL,
  funded_by TEXT NOT NULL DEFAULT 'studio-treasury',
  eligibility_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  cutoff_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (funded_by = 'studio-treasury')
);

CREATE TABLE IF NOT EXISTS pvp_matches (
  match_id UUID PRIMARY KEY,
  season_id TEXT REFERENCES pvp_seasons(season_id),
  seed BIGINT NOT NULL,
  p1_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  p2_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  status TEXT NOT NULL CHECK (status IN ('active', 'complete', 'cancelled')),
  current_turn_player_id TEXT,
  winner_id TEXT,
  completion_reason TEXT CHECK (completion_reason IN ('combat', 'forfeit', 'timeout')),
  final_hp_json JSONB,
  action_count INTEGER NOT NULL DEFAULT 0,
  turn_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (p1_id <> p2_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_player_1 ON pvp_matches(p1_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_player_2 ON pvp_matches(p2_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_season ON pvp_matches(season_id);

CREATE TABLE IF NOT EXISTS pvp_match_actions (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES pvp_matches(match_id),
  turn_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  action TEXT NOT NULL CHECK (action IN ('attack', 'freeze', 'defend')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, turn_number)
);

CREATE TABLE IF NOT EXISTS pvp_rating_events (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES pvp_matches(match_id),
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  rating_before INTEGER NOT NULL,
  rating_delta INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS pvp_match_quality_metrics (
  match_id UUID PRIMARY KEY REFERENCES pvp_matches(match_id),
  action_count INTEGER NOT NULL,
  duration_seconds INTEGER,
  was_short_match BOOLEAN NOT NULL DEFAULT FALSE,
  was_forfeit_or_timeout BOOLEAN NOT NULL DEFAULT FALSE,
  repeated_pair_count_for_p1 INTEGER NOT NULL DEFAULT 0,
  repeated_pair_count_for_p2 INTEGER NOT NULL DEFAULT 0,
  suspicious_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pvp_season_snapshots (
  snapshot_id UUID PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  generated_by_admin TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rules_summary_json JSONB NOT NULL,
  snapshot_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pvp_season_snapshot_rows (
  snapshot_id UUID NOT NULL REFERENCES pvp_season_snapshots(snapshot_id),
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  rank INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  eligibility_status TEXT NOT NULL
    CHECK (eligibility_status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  eligible BOOLEAN NOT NULL,
  completed_matches INTEGER NOT NULL,
  unique_opponents INTEGER NOT NULL,
  forfeit_rate NUMERIC(5, 4) NOT NULL,
  short_match_rate NUMERIC(5, 4) NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_id, player_id),
  UNIQUE (snapshot_id, rank)
);

CREATE TABLE IF NOT EXISTS pvp_payout_plans (
  plan_id UUID PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  snapshot_id UUID REFERENCES pvp_season_snapshots(snapshot_id),
  created_by_admin TEXT NOT NULL,
  prize_pool_raw NUMERIC(78, 0) NOT NULL,
  plan_json JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected', 'cancelled', 'executed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by_admin TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by_admin TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_by_admin TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  execution_tx_signature TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_pvp_payout_plans_season_status ON pvp_payout_plans(season_id, status);

CREATE TABLE IF NOT EXISTS pvp_payout_transactions (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES pvp_payout_plans(plan_id),
  recipient_player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  amount_raw NUMERIC(78, 0) NOT NULL,
  tx_signature TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Latest anti-sybil eligibility evaluation per player per season. This is the
-- durable target for PvpEligibilityRepository.saveEvaluation. It is an
-- evaluation cache, not a payout authority: snapshots + payout plans remain the
-- admin-gated source of truth for any studio-funded reward.
CREATE TABLE IF NOT EXISTS pvp_eligibility_evaluations (
  season_id TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  status TEXT NOT NULL
    CHECK (status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  eligible BOOLEAN NOT NULL,
  evaluation_json JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, player_id)
);

-- Mainnet prototype cosmetic shop storage. These tables record server-created
-- orders and verified player-signed SPL transfers only; they do not authorize
-- backend movement of player tokens and do not represent rewards, staking, or
-- any player-funded prize pool.
CREATE TABLE IF NOT EXISTS shop_orders (
  order_id UUID PRIMARY KEY,
  buyer_wallet TEXT NOT NULL,
  item_id TEXT NOT NULL,
  mint TEXT NOT NULL,
  amount_raw NUMERIC(78, 0) NOT NULL,
  decimals INTEGER NOT NULL,
  treasury_token_account TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirming', 'confirmed', 'expired', 'failed')),
  tx_signature TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_buyer_wallet ON shop_orders(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status_expires ON shop_orders(status, expires_at);

CREATE TABLE IF NOT EXISTS shop_inventory_grants (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('aether')),
  order_id UUID NOT NULL REFERENCES shop_orders(order_id),
  tx_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id),
  UNIQUE (wallet, item_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_inventory_wallet ON shop_inventory_grants(wallet);
```


---

## apps/server/src/pvp/repositories.ts

```ts
import type { MatchRecord, RankedPlayer } from './ladder.js';
import type { EligibilityEvaluation, EligibilityProfile, PlayerFlag, SeasonSnapshot } from './eligibility.js';

/**
 * Repository contracts for the production Postgres adapter.
 *
 * The current package intentionally keeps an in-memory implementation for local
 * development/tests, but ranked seasons with real $AETHER prizes must back these
 * contracts with durable Postgres tables from resources/pvp_database_schema.sql.
 */
export interface PvpPlayerRepository {
  upsertRankedPlayer(player: RankedPlayer): Promise<RankedPlayer>;
  getRankedPlayer(playerId: string): Promise<RankedPlayer | null>;
  listRankedPlayers(limit: number): Promise<RankedPlayer[]>;
}

export interface PvpMatchRepository {
  insertMatch(record: MatchRecord): Promise<MatchRecord>;
  getMatch(matchId: string): Promise<MatchRecord | null>;
  listMatchesForPlayer(playerId: string, seasonId?: string): Promise<MatchRecord[]>;
  listSeasonMatches(seasonId: string): Promise<MatchRecord[]>;
}

export interface PvpEligibilityRepository {
  upsertProfile(profile: EligibilityProfile): Promise<EligibilityProfile>;
  getProfile(playerId: string): Promise<EligibilityProfile | null>;
  insertFlag(playerId: string, flag: PlayerFlag): Promise<PlayerFlag>;
  clearFlag(playerId: string, flagId: string | null, clearedBy: string): Promise<void>;
  saveEvaluation(seasonId: string, evaluation: EligibilityEvaluation): Promise<void>;
}

export interface PvpSeasonRepository {
  saveSnapshot(snapshot: SeasonSnapshot): Promise<SeasonSnapshot>;
  getLatestSnapshot(seasonId: string): Promise<SeasonSnapshot | null>;
  savePayoutPlan(seasonId: string, payoutPlanJson: unknown, createdBy: string): Promise<void>;
}

export type PvpRepositories = {
  players: PvpPlayerRepository;
  matches: PvpMatchRepository;
  eligibility: PvpEligibilityRepository;
  seasons: PvpSeasonRepository;
};
```


---

## apps/server/src/pvp/matchmaking.ts

```ts
import crypto from 'node:crypto';
import {
  applyDuelAction,
  createDuelState,
  getCurrentActorId,
  getOpponentId,
  type DuelAction,
  type DuelState,
} from './duelEngine.js';
import { ladder, type MatchRecord, type RankedPlayer } from './ladder.js';
import { persistCompletedMatch } from './pvpPersistence.js';

export type PvpPlayerRef = {
  id: string;
  name: string;
};

export type LiveMatchStatus = 'active' | 'complete';

export type LiveMatch = {
  matchId: string;
  status: LiveMatchStatus;
  seed: number;
  p1: PvpPlayerRef;
  p2: PvpPlayerRef;
  duel: DuelState;
  actionsByPlayer: Record<string, DuelAction[]>;
  createdAt: string;
  updatedAt: string;
  turnDeadlineAt: string;
  winnerId: string | null;
  ratingDelta?: Record<string, number>;
  completionReason?: 'combat' | 'forfeit' | 'timeout';
};

export type PublicMatchState = {
  matchId: string;
  status: LiveMatchStatus;
  p1: PvpPlayerRef;
  p2: PvpPlayerRef;
  viewerId: string;
  currentTurnPlayerId: string | null;
  yourTurn: boolean;
  turnDeadlineAt: string | null;
  turns: number;
  time: number;
  fighters: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    nextTurn: number;
    defending: boolean;
  }>;
  winnerId: string | null;
  ratingDelta?: Record<string, number>;
  seed?: number; // exposed only after match completion for audit/replay
  recentLog: string[];
};

const TURN_TIMEOUT_MS = 45_000;
const waitingQueue = new Map<string, PvpPlayerRef>();
const matches = new Map<string, LiveMatch>();
const activeMatchByPlayer = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function deadlineIso(): string {
  return new Date(Date.now() + TURN_TIMEOUT_MS).toISOString();
}

function serverSeed(): number {
  return crypto.randomBytes(4).readUInt32BE(0);
}

function randomizeSides(a: PvpPlayerRef, b: PvpPlayerRef): { p1: PvpPlayerRef; p2: PvpPlayerRef } {
  return crypto.randomInt(2) === 0 ? { p1: a, p2: b } : { p1: b, p2: a };
}

function getParticipant(match: LiveMatch, playerId: string): PvpPlayerRef | null {
  if (match.p1.id === playerId) return match.p1;
  if (match.p2.id === playerId) return match.p2;
  return null;
}

function clonePublicState(match: LiveMatch, viewerId: string): PublicMatchState {
  const currentTurnPlayerId = match.status === 'active' ? getCurrentActorId(match.duel) : null;
  return {
    matchId: match.matchId,
    status: match.status,
    p1: { ...match.p1 },
    p2: { ...match.p2 },
    viewerId,
    currentTurnPlayerId,
    yourTurn: currentTurnPlayerId === viewerId,
    turnDeadlineAt: match.status === 'active' ? match.turnDeadlineAt : null,
    turns: match.duel.turns,
    time: match.duel.time,
    fighters: [match.duel.fighters.p1, match.duel.fighters.p2].map((f) => ({
      id: f.id,
      name: f.name,
      hp: f.hp,
      maxHp: f.maxHp,
      nextTurn: f.nextTurn,
      defending: f.defending,
    })),
    winnerId: match.winnerId,
    ratingDelta: match.ratingDelta ? { ...match.ratingDelta } : undefined,
    seed: match.status === 'complete' ? match.seed : undefined,
    recentLog: match.duel.log.slice(-8),
  };
}

function completeMatch(match: LiveMatch, reason: 'combat' | 'forfeit' | 'timeout', winnerId: string | null): MatchRecord {
  if (match.status === 'complete' && match.ratingDelta) {
    const existing = ladder.getMatch(match.matchId);
    if (!existing) throw new Error('completed match missing ladder record');
    return existing;
  }

  match.status = 'complete';
  match.winnerId = winnerId;
  match.completionReason = reason;
  match.updatedAt = nowIso();
  match.duel.status = 'complete';
  match.duel.winnerId = winnerId;

  const record = ladder.recordResolvedMatch({
    matchId: match.matchId,
    seed: match.seed,
    p1: match.p1,
    p2: match.p2,
    actions1: [...(match.actionsByPlayer[match.p1.id] ?? [])],
    actions2: [...(match.actionsByPlayer[match.p2.id] ?? [])],
    winnerId,
    completionReason: reason,
    finalHp: {
      [match.duel.fighters.p1.id]: match.duel.fighters.p1.hp,
      [match.duel.fighters.p2.id]: match.duel.fighters.p2.hp,
    },
  });

  match.ratingDelta = { ...record.ratingDelta };
  activeMatchByPlayer.delete(match.p1.id);
  activeMatchByPlayer.delete(match.p2.id);

  // Durable write-through (fire-and-forget). The ladder already updated live
  // ratings above; this persists the authoritative post-match state.
  const persistPlayers = [ladder.getPlayer(match.p1.id), ladder.getPlayer(match.p2.id)].filter(
    (p): p is RankedPlayer => Boolean(p),
  );
  persistCompletedMatch(record, persistPlayers);

  return record;
}

function createMatch(a: PvpPlayerRef, b: PvpPlayerRef, forcedSeed?: number, forcedSides?: { p1: PvpPlayerRef; p2: PvpPlayerRef }): LiveMatch {
  if (a.id === b.id) throw new Error('cannot match player against self');
  const seed = forcedSeed ?? serverSeed();
  const { p1, p2 } = forcedSides ?? randomizeSides(a, b);
  const duel = createDuelState({ seed, p1, p2 });
  const match: LiveMatch = {
    matchId: crypto.randomUUID(),
    status: 'active',
    seed,
    p1,
    p2,
    duel,
    actionsByPlayer: { [p1.id]: [], [p2.id]: [] },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    turnDeadlineAt: deadlineIso(),
    winnerId: null,
  };
  matches.set(match.matchId, match);
  activeMatchByPlayer.set(p1.id, match.matchId);
  activeMatchByPlayer.set(p2.id, match.matchId);
  ladder.ensurePlayer(p1.id, p1.name);
  ladder.ensurePlayer(p2.id, p2.name);
  return match;
}

export const matchmaking = {
  queuePlayer(player: PvpPlayerRef): { status: 'queued'; playerId: string } | { status: 'matched'; match: PublicMatchState } {
    if (activeMatchByPlayer.has(player.id)) {
      const match = matches.get(activeMatchByPlayer.get(player.id)!);
      if (match) return { status: 'matched', match: clonePublicState(match, player.id) };
      activeMatchByPlayer.delete(player.id);
    }

    waitingQueue.delete(player.id);
    const opponent = [...waitingQueue.values()].find((p) => p.id !== player.id);
    if (!opponent) {
      waitingQueue.set(player.id, { ...player });
      ladder.ensurePlayer(player.id, player.name);
      return { status: 'queued', playerId: player.id };
    }

    waitingQueue.delete(opponent.id);
    const match = createMatch(opponent, player);
    return { status: 'matched', match: clonePublicState(match, player.id) };
  },

  getActiveMatchForPlayer(playerId: string): PublicMatchState | null {
    const matchId = activeMatchByPlayer.get(playerId);
    if (!matchId) return null;
    const match = matches.get(matchId);
    if (!match) {
      activeMatchByPlayer.delete(playerId);
      return null;
    }
    return clonePublicState(match, playerId);
  },

  getMatchForPlayer(matchId: string, playerId: string): PublicMatchState | null {
    const match = matches.get(matchId);
    if (!match || !getParticipant(match, playerId)) return null;
    return clonePublicState(match, playerId);
  },

  submitAction(matchId: string, playerId: string, action: DuelAction): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, playerId)) throw new Error('not a match participant');
    if (match.status === 'complete') throw new Error('match already complete');

    const deadlineMs = Date.parse(match.turnDeadlineAt);
    if (Number.isFinite(deadlineMs) && deadlineMs < Date.now()) throw new Error('turn deadline expired');

    const currentActorId = getCurrentActorId(match.duel);
    if (currentActorId !== playerId) throw new Error('not this player turn');

    match.actionsByPlayer[playerId] = match.actionsByPlayer[playerId] ?? [];
    match.actionsByPlayer[playerId].push(action);
    applyDuelAction(match.duel, playerId, action);
    match.updatedAt = nowIso();

    if (match.duel.status === 'complete') {
      completeMatch(match, 'combat', match.duel.winnerId);
    } else {
      match.turnDeadlineAt = deadlineIso();
    }

    return clonePublicState(match, playerId);
  },

  forfeit(matchId: string, playerId: string): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, playerId)) throw new Error('not a match participant');
    if (match.status === 'complete') return clonePublicState(match, playerId);

    const opponentId = getOpponentId(match.duel, playerId);
    completeMatch(match, 'forfeit', opponentId);
    return clonePublicState(match, playerId);
  },

  claimTimeout(matchId: string, requesterId: string): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, requesterId)) throw new Error('not a match participant');
    if (match.status === 'complete') return clonePublicState(match, requesterId);

    const deadlineMs = Date.parse(match.turnDeadlineAt);
    if (!Number.isFinite(deadlineMs) || deadlineMs >= Date.now()) throw new Error('turn not expired');

    const latePlayerId = getCurrentActorId(match.duel);
    const winnerId = latePlayerId ? getOpponentId(match.duel, latePlayerId) : null;
    completeMatch(match, 'timeout', winnerId);
    return clonePublicState(match, requesterId);
  },

  _createMatchForTests(a: PvpPlayerRef, b: PvpPlayerRef, seed = 1, forcedSides?: { p1: PvpPlayerRef; p2: PvpPlayerRef }): LiveMatch {
    return createMatch(a, b, seed, forcedSides);
  },

  _getRawMatch(matchId: string): LiveMatch | undefined {
    return matches.get(matchId);
  },

  _reset() {
    waitingQueue.clear();
    matches.clear();
    activeMatchByPlayer.clear();
  },
};
```


---

## apps/server/src/pvp/eligibility.ts

```ts
import crypto from 'node:crypto';
import { ladder, type MatchCompletionReason, type MatchRecord, type RankedPlayer } from './ladder.js';
import { buildPayoutPlanFromPlayers, type PayoutPlan, type SeasonConfig } from './season.js';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'flagged_review' | 'banned' | 'admin_excluded';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IdentityObservation = {
  observedAt: string;
  ipHash?: string;
  deviceHash?: string;
  userAgentHash?: string;
};

export type PlayerFlag = {
  flagId: string;
  reason: string;
  severity: FlagSeverity;
  note?: string;
  createdAt: string;
  createdBy: string;
  clearedAt?: string;
  clearedBy?: string;
};

export type EligibilityProfile = {
  playerId: string;
  displayName?: string;
  walletAuthenticated: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  adminExcluded: boolean;
  banned: boolean;
  flags: PlayerFlag[];
  identitySignals: IdentityObservation[];
};

export type EligibilityRules = {
  seasonId: string;
  seasonCutoffAt: string;
  minAccountAgeDays: number;
  minCompletedMatches: number;
  minUniqueOpponents: number;
  maxCountedMatchesPerOpponent: number;
  maxForfeitRate: number;
  shortMatchMaxActions: number;
  maxShortMatchRate: number;
  maxIdentityClusterSize: number;
  fingerprintingEnabled: boolean;
  fingerprintSalt: string;
  testWalletPrefixes: string[];
  adminExcludedWallets: string[];
};

export type EligibilityStats = {
  completedMatches: number;
  countedMatches: number;
  uniqueOpponents: number;
  maxMatchesAgainstSingleOpponent: number;
  wins: number;
  losses: number;
  draws: number;
  forfeitsOrTimeouts: number;
  forfeitRate: number;
  shortMatches: number;
  shortMatchRate: number;
  strongestIdentityClusterSize: number;
};

export type EligibilityEvaluation = {
  playerId: string;
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  stats: EligibilityStats;
  profile: Omit<EligibilityProfile, 'flags' | 'identitySignals'> & { activeFlagCount: number; identitySignalCount: number };
  evaluatedAt: string;
};

export type SeasonSnapshotRow = {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  stats: EligibilityStats;
};

export type SeasonSnapshot = {
  seasonId: string;
  generatedAt: string;
  rulesSummary: Omit<EligibilityRules, 'fingerprintSalt'>;
  rows: SeasonSnapshotRow[];
  eligiblePlayers: RankedPlayer[];
  flaggedCount: number;
  ineligibleCount: number;
  bannedOrExcludedCount: number;
};

export type RegisterPlayerInput = {
  playerId: string;
  displayName?: string;
  walletAuthenticated?: boolean;
  observedAt?: string;
  identity?: IdentityObservation;
};

export type RawIdentityInput = {
  ip?: string;
  deviceFingerprint?: string;
  userAgent?: string;
};

const profiles = new Map<string, EligibilityProfile>();
const snapshots = new Map<string, SeasonSnapshot>();

function nowIso(): string {
  return new Date().toISOString();
}

function activeFlags(profile: EligibilityProfile): PlayerFlag[] {
  return profile.flags.filter((flag) => !flag.clearedAt);
}

function cloneProfile(profile: EligibilityProfile): EligibilityProfile {
  return {
    ...profile,
    flags: profile.flags.map((flag) => ({ ...flag })),
    identitySignals: profile.identitySignals.map((signal) => ({ ...signal })),
  };
}

function getOrCreateProfile(playerId: string, displayName?: string, observedAt = nowIso()): EligibilityProfile {
  let profile = profiles.get(playerId);
  if (!profile) {
    profile = {
      playerId,
      displayName,
      walletAuthenticated: false,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      adminExcluded: false,
      banned: false,
      flags: [],
      identitySignals: [],
    };
    profiles.set(playerId, profile);
  }
  if (displayName) profile.displayName = displayName;
  profile.lastSeenAt = observedAt;
  return profile;
}

function hashSignal(value: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function buildPrivacySafeIdentityObservation(
  input: RawIdentityInput,
  rules: Pick<EligibilityRules, 'fingerprintingEnabled' | 'fingerprintSalt'>,
  observedAt = nowIso(),
): IdentityObservation | undefined {
  if (!rules.fingerprintingEnabled) return undefined;
  const salt = rules.fingerprintSalt.trim();
  if (!salt) return undefined;

  const out: IdentityObservation = { observedAt };
  if (input.ip) out.ipHash = hashSignal(input.ip, salt);
  if (input.deviceFingerprint) out.deviceHash = hashSignal(input.deviceFingerprint, salt);
  if (input.userAgent) out.userAgentHash = hashSignal(input.userAgent, salt);

  return out.ipHash || out.deviceHash || out.userAgentHash ? out : undefined;
}

function playerMatches(playerId: string, matches: MatchRecord[]): MatchRecord[] {
  return matches.filter((m) => m.p1Id === playerId || m.p2Id === playerId);
}

function opponentFor(playerId: string, match: MatchRecord): string {
  return match.p1Id === playerId ? match.p2Id : match.p1Id;
}

function countByOpponent(playerId: string, matches: MatchRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of matches) {
    const opp = opponentFor(playerId, match);
    counts.set(opp, (counts.get(opp) ?? 0) + 1);
  }
  return counts;
}

function identityClusterSize(profile: EligibilityProfile): number {
  const hashes = new Set<string>();
  for (const signal of profile.identitySignals) {
    if (signal.ipHash) hashes.add(`ip:${signal.ipHash}`);
    if (signal.deviceHash) hashes.add(`device:${signal.deviceHash}`);
    if (signal.userAgentHash) hashes.add(`ua:${signal.userAgentHash}`);
  }
  if (hashes.size === 0) return 1;

  let max = 1;
  for (const hash of hashes) {
    let count = 0;
    for (const other of profiles.values()) {
      const otherHashes = new Set<string>();
      for (const signal of other.identitySignals) {
        if (signal.ipHash) otherHashes.add(`ip:${signal.ipHash}`);
        if (signal.deviceHash) otherHashes.add(`device:${signal.deviceHash}`);
        if (signal.userAgentHash) otherHashes.add(`ua:${signal.userAgentHash}`);
      }
      if (otherHashes.has(hash)) count += 1;
    }
    max = Math.max(max, count);
  }
  return max;
}

function statsFor(playerId: string, matches = ladder.listMatches()): EligibilityStats {
  const played = playerMatches(playerId, matches);
  const counts = countByOpponent(playerId, played);
  const completedMatches = played.length;
  const uniqueOpponents = counts.size;
  const countedMatches = [...counts.values()].reduce((sum, count) => sum + Math.min(count, 3), 0);
  const wins = played.filter((m) => m.winnerId === playerId).length;
  const losses = played.filter((m) => m.winnerId && m.winnerId !== playerId).length;
  const draws = played.filter((m) => m.winnerId === null).length;
  const forfeitsOrTimeouts = played.filter((m) => m.completionReason === 'forfeit' || m.completionReason === 'timeout').length;
  const shortMatches = played.filter((m) => m.actions1.length + m.actions2.length <= 3).length;
  const profile = profiles.get(playerId);

  return {
    completedMatches,
    countedMatches,
    uniqueOpponents,
    maxMatchesAgainstSingleOpponent: counts.size ? Math.max(...counts.values()) : 0,
    wins,
    losses,
    draws,
    forfeitsOrTimeouts,
    forfeitRate: completedMatches ? forfeitsOrTimeouts / completedMatches : 0,
    shortMatches,
    shortMatchRate: completedMatches ? shortMatches / completedMatches : 0,
    strongestIdentityClusterSize: profile ? identityClusterSize(profile) : 1,
  };
}

function statsForWithRules(playerId: string, rules: EligibilityRules, matches = ladder.listMatches()): EligibilityStats {
  const played = playerMatches(playerId, matches);
  const counts = countByOpponent(playerId, played);
  const completedMatches = played.length;
  const uniqueOpponents = counts.size;
  const countedMatches = [...counts.values()].reduce((sum, count) => sum + Math.min(count, rules.maxCountedMatchesPerOpponent), 0);
  const wins = played.filter((m) => m.winnerId === playerId).length;
  const losses = played.filter((m) => m.winnerId && m.winnerId !== playerId).length;
  const draws = played.filter((m) => m.winnerId === null).length;
  const forfeitsOrTimeouts = played.filter((m) => m.completionReason === 'forfeit' || m.completionReason === 'timeout').length;
  const shortMatches = played.filter((m) => m.actions1.length + m.actions2.length <= rules.shortMatchMaxActions).length;
  const profile = profiles.get(playerId);

  return {
    completedMatches,
    countedMatches,
    uniqueOpponents,
    maxMatchesAgainstSingleOpponent: counts.size ? Math.max(...counts.values()) : 0,
    wins,
    losses,
    draws,
    forfeitsOrTimeouts,
    forfeitRate: completedMatches ? forfeitsOrTimeouts / completedMatches : 0,
    shortMatches,
    shortMatchRate: completedMatches ? shortMatches / completedMatches : 0,
    strongestIdentityClusterSize: profile ? identityClusterSize(profile) : 1,
  };
}

function safePlayerSummary(profile: EligibilityProfile): EligibilityEvaluation['profile'] {
  return {
    playerId: profile.playerId,
    displayName: profile.displayName,
    walletAuthenticated: profile.walletAuthenticated,
    firstSeenAt: profile.firstSeenAt,
    lastSeenAt: profile.lastSeenAt,
    adminExcluded: profile.adminExcluded,
    banned: profile.banned,
    activeFlagCount: activeFlags(profile).length,
    identitySignalCount: profile.identitySignals.length,
  };
}

function isTestWallet(playerId: string, rules: EligibilityRules): boolean {
  return rules.testWalletPrefixes.some((prefix) => prefix && playerId.startsWith(prefix));
}

export const eligibility = {
  registerPlayer(input: RegisterPlayerInput): EligibilityProfile {
    const observedAt = input.observedAt ?? nowIso();
    const profile = getOrCreateProfile(input.playerId, input.displayName, observedAt);
    if (input.walletAuthenticated) profile.walletAuthenticated = true;
    if (input.identity) profile.identitySignals.push({ ...input.identity, observedAt: input.identity.observedAt ?? observedAt });
    return cloneProfile(profile);
  },

  getProfile(playerId: string): EligibilityProfile | undefined {
    const profile = profiles.get(playerId);
    return profile ? cloneProfile(profile) : undefined;
  },

  listProfiles(): EligibilityProfile[] {
    return [...profiles.values()].map(cloneProfile);
  },

  flagPlayer(playerId: string, reason: string, severity: FlagSeverity = 'medium', createdBy = 'admin', note?: string): PlayerFlag {
    const profile = getOrCreateProfile(playerId);
    const flag: PlayerFlag = {
      flagId: crypto.randomUUID(),
      reason,
      severity,
      note,
      createdAt: nowIso(),
      createdBy,
    };
    profile.flags.push(flag);
    return { ...flag };
  },

  banPlayer(playerId: string, createdBy = 'admin', reason = 'admin ban'): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    profile.banned = true;
    this.flagPlayer(playerId, reason, 'critical', createdBy);
    return cloneProfile(profile);
  },

  clearFlag(playerId: string, flagId?: string, clearedBy = 'admin'): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    const clearedAt = nowIso();
    for (const flag of profile.flags) {
      if (!flag.clearedAt && (!flagId || flag.flagId === flagId)) {
        flag.clearedAt = clearedAt;
        flag.clearedBy = clearedBy;
      }
    }
    return cloneProfile(profile);
  },

  setAdminExcluded(playerId: string, excluded: boolean, createdBy = 'admin', note?: string): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    profile.adminExcluded = excluded;
    if (excluded) this.flagPlayer(playerId, 'admin excluded from prize eligibility', 'high', createdBy, note);
    return cloneProfile(profile);
  },

  evaluatePlayer(playerId: string, rules: EligibilityRules): EligibilityEvaluation {
    const profile = getOrCreateProfile(playerId);
    const stats = statsForWithRules(playerId, rules);
    const reasons: string[] = [];
    const warnings: string[] = [];
    const firstSeenMs = Date.parse(profile.firstSeenAt);
    const cutoffMs = Date.parse(rules.seasonCutoffAt);
    const minAgeMs = Math.max(0, rules.minAccountAgeDays) * 86_400_000;

    if (!profile.walletAuthenticated) reasons.push('wallet not authenticated with SIWS');
    if (!Number.isFinite(firstSeenMs) || !Number.isFinite(cutoffMs) || firstSeenMs > cutoffMs) {
      reasons.push('account was not created before the season cutoff');
    }
    if (Number.isFinite(firstSeenMs) && Date.now() - firstSeenMs < minAgeMs) {
      reasons.push(`account younger than ${rules.minAccountAgeDays} day minimum`);
    }
    if (stats.completedMatches < rules.minCompletedMatches) reasons.push(`requires at least ${rules.minCompletedMatches} completed ranked matches`);
    if (stats.uniqueOpponents < rules.minUniqueOpponents) reasons.push(`requires at least ${rules.minUniqueOpponents} unique opponents`);
    if (stats.countedMatches < rules.minCompletedMatches) reasons.push('too many matches are against the same opponents to count fully');

    if (stats.maxMatchesAgainstSingleOpponent > rules.maxCountedMatchesPerOpponent) warnings.push('repeated same-opponent farming signal');
    if (stats.forfeitRate > rules.maxForfeitRate) warnings.push('abnormal forfeit/timeout rate');
    if (stats.shortMatchRate > rules.maxShortMatchRate) warnings.push('abnormal ultra-short match rate');
    if (stats.completedMatches >= rules.minCompletedMatches && (stats.wins === 0 || stats.losses === 0)) {
      warnings.push('low win/loss diversity; requires manual review');
    }
    if (rules.fingerprintingEnabled && stats.strongestIdentityClusterSize > rules.maxIdentityClusterSize) {
      warnings.push('identity/device/IP hash cluster above threshold');
    }
    for (const flag of activeFlags(profile)) warnings.push(`active flag: ${flag.reason}`);

    let status: EligibilityStatus = 'eligible';
    if (profile.banned) status = 'banned';
    else if (profile.adminExcluded || rules.adminExcludedWallets.includes(playerId) || isTestWallet(playerId, rules)) status = 'admin_excluded';
    else if (reasons.length > 0) status = 'ineligible';
    else if (warnings.length > 0) status = 'flagged_review';

    return {
      playerId,
      status,
      eligible: status === 'eligible',
      reasons,
      warnings,
      stats,
      profile: safePlayerSummary(profile),
      evaluatedAt: nowIso(),
    };
  },

  createSeasonSnapshot(seasonId: string, rules: EligibilityRules, options?: { save?: boolean; limit?: number }): SeasonSnapshot {
    const ranked = ladder.leaderboard(options?.limit ?? 1000);
    const rows: SeasonSnapshotRow[] = ranked.map((player, index) => {
      const evaluation = this.evaluatePlayer(player.id, { ...rules, seasonId });
      return {
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        status: evaluation.status,
        eligible: evaluation.eligible,
        reasons: [...evaluation.reasons],
        warnings: [...evaluation.warnings],
        stats: { ...evaluation.stats },
      };
    });

    const eligibleIds = new Set(rows.filter((row) => row.eligible).map((row) => row.playerId));
    const eligiblePlayers = ranked.filter((player) => eligibleIds.has(player.id));
    const { fingerprintSalt: _fingerprintSalt, ...safeRules } = { ...rules, seasonId };
    void _fingerprintSalt;
    const snapshot: SeasonSnapshot = {
      seasonId,
      generatedAt: nowIso(),
      rulesSummary: safeRules,
      rows,
      eligiblePlayers,
      flaggedCount: rows.filter((row) => row.status === 'flagged_review').length,
      ineligibleCount: rows.filter((row) => row.status === 'ineligible').length,
      bannedOrExcludedCount: rows.filter((row) => row.status === 'banned' || row.status === 'admin_excluded').length,
    };

    if (options?.save !== false) snapshots.set(seasonId, snapshot);
    return snapshot;
  },

  getLatestSnapshot(seasonId: string): SeasonSnapshot | undefined {
    const snapshot = snapshots.get(seasonId);
    return snapshot
      ? {
          ...snapshot,
          rulesSummary: { ...snapshot.rulesSummary },
          rows: snapshot.rows.map((row) => ({ ...row, reasons: [...row.reasons], warnings: [...row.warnings], stats: { ...row.stats } })),
          eligiblePlayers: snapshot.eligiblePlayers.map((player) => ({ ...player })),
        }
      : undefined;
  },

  buildEligiblePayoutPlan(config: SeasonConfig, snapshot?: SeasonSnapshot): PayoutPlan {
    const sourceSnapshot = snapshot ?? snapshots.get(config.seasonId);
    if (!sourceSnapshot) throw new Error('season snapshot required before payout planning');
    return buildPayoutPlanFromPlayers(config, sourceSnapshot.eligiblePlayers, 'eligible-season-snapshot');
  },

  _statsForTests(playerId: string): EligibilityStats {
    return statsFor(playerId);
  },

  _reset() {
    profiles.clear();
    snapshots.clear();
  },
};
```


---

## apps/server/src/pvp/season.ts

```ts
// Season prize pool — STUDIO-FUNDED ONLY.
//
// IMPORTANT LEGAL/DESIGN INVARIANT:
// The prize pool is funded entirely by the studio treasury that YOU control.
// Players NEVER contribute funds to this pool. There is no entry fee that feeds
// the pool, no player-vs-player stake, and no pooling of player money. This is
// the difference between a sponsored esports prize (legitimate) and player-
// funded wagering (regulated gambling in most jurisdictions). This module is
// written so that distinction is enforced by structure, not just intention:
// the pool amount comes from server/admin config, and there is no code path that
// adds player funds to it.
//
// Payouts compute top eligible finishers by skill rating at season end and
// produce a payout PLAN. Actually sending $AETHER is a separate, deliberate
// treasury action (the server signs transfers from the studio treasury wallet —
// never from players). Keeping payout-planning and payout-execution separate
// means a human/ops step gates real funds leaving the treasury.

import { ladder, type RankedPlayer } from './ladder.js';

// Configure this from your studio treasury. Amounts are in raw token units
// (e.g. 6 decimals -> 1 $AETHER = 1_000_000). Set via env/admin in production.
export type SeasonConfig = {
  seasonId: string;
  // distribution among top eligible finishers, must sum to <= 1.0 of the pool
  distribution: number[]; // e.g. [0.5, 0.3, 0.2] for top 3
  prizePoolRaw: string;   // total studio-funded pool, raw units
  decimals: number;
  fundedByStudio: true;   // type-level reminder; there is no other funding source
};

export type PrizePayout = {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  amountRaw: string;
};

export type PayoutPlan = {
  seasonId: string;
  prizePoolRaw: string;
  fundedBy: 'studio-treasury';
  payoutSource: 'eligible-season-snapshot' | 'raw-ladder-dev';
  payouts: PrizePayout[];
  note: string;
};

function validateDistribution(config: SeasonConfig): void {
  if (!/^\d+$/.test(config.prizePoolRaw)) throw new Error('prizePoolRaw must be a non-negative integer string');
  const totalShare = config.distribution.reduce((a, b) => a + b, 0);
  if (totalShare > 1.0000001) {
    throw new Error('distribution exceeds 100% of the prize pool');
  }
}

export function buildPayoutPlanFromPlayers(
  config: SeasonConfig,
  rankedPlayers: RankedPlayer[],
  payoutSource: PayoutPlan['payoutSource'] = 'eligible-season-snapshot',
): PayoutPlan {
  validateDistribution(config);

  const pool = BigInt(config.prizePoolRaw);
  const top = rankedPlayers
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, config.distribution.length);

  const payouts: PrizePayout[] = top.map((p: RankedPlayer, i: number) => {
    // integer-safe share: floor(pool * share_bp / 10000)
    const bp = BigInt(Math.round(config.distribution[i] * 10000));
    const amount = (pool * bp) / 10000n;
    return {
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      rating: p.rating,
      amountRaw: amount.toString(),
    };
  });

  return {
    seasonId: config.seasonId,
    prizePoolRaw: config.prizePoolRaw,
    fundedBy: 'studio-treasury',
    payoutSource,
    payouts,
    note:
      'Prize pool funded entirely by the studio treasury. No player funds are ' +
      'pooled or wagered. Entry to ranked is free/skill-based. Execute payouts ' +
      'as a separate, signed treasury transfer after eligibility review.',
  };
}

/**
 * Dev fallback: raw ladder payout plan. Production/admin routes should prefer
 * an eligibility snapshot via buildPayoutPlanFromPlayers(..., eligiblePlayers).
 */
export function buildPayoutPlan(config: SeasonConfig): PayoutPlan {
  return buildPayoutPlanFromPlayers(config, ladder.leaderboard(config.distribution.length), 'raw-ladder-dev');
}
```


---

## apps/server/src/pvp/payoutApproval.ts

```ts
import crypto from 'node:crypto';
import type { PayoutPlan } from './season.js';

export type PayoutApprovalStatus = 'pending_review' | 'approved' | 'rejected' | 'cancelled';

export type PayoutApprovalRequest = {
  requestId: string;
  seasonId: string;
  status: PayoutApprovalStatus;
  payoutPlan: PayoutPlan;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  executionTxSignature?: string;
};

/**
 * Durable-friendly contract for the payout approval workflow.
 *
 * Approval is deliberately separate from planning (PayoutPlan generation) and
 * from execution (signed treasury transfer). This repository only records the
 * review lifecycle and the execution signature; it never moves funds. The
 * in-memory adapter backs local dev/tests; the Postgres adapter persists to
 * pvp_payout_plans so approvals survive restarts and double execution is
 * blocked by a unique execution_tx_signature.
 */
export interface PayoutApprovalRepository {
  create(payoutPlan: PayoutPlan, createdBy: string): Promise<PayoutApprovalRequest>;
  get(requestId: string): Promise<PayoutApprovalRequest | null>;
  list(seasonId?: string): Promise<PayoutApprovalRequest[]>;
  approve(requestId: string, approvedBy: string): Promise<PayoutApprovalRequest>;
  reject(requestId: string, rejectedBy: string, reason: string): Promise<PayoutApprovalRequest>;
  cancel(requestId: string, cancelledBy: string, reason: string): Promise<PayoutApprovalRequest>;
  attachExecutionSignature(requestId: string, txSignature: string, actor: string): Promise<PayoutApprovalRequest>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneRequest(request: PayoutApprovalRequest): PayoutApprovalRequest {
  return {
    ...request,
    payoutPlan: {
      ...request.payoutPlan,
      payouts: request.payoutPlan.payouts.map((p) => ({ ...p })),
    },
  };
}

function assertPending(request: PayoutApprovalRequest): void {
  if (request.status !== 'pending_review') throw new Error(`payout request is ${request.status}`);
}

export function createMemoryPayoutApprovalRepository(): PayoutApprovalRepository & { _reset(): void } {
  const requests = new Map<string, PayoutApprovalRequest>();

  return {
    async create(payoutPlan: PayoutPlan, createdBy: string): Promise<PayoutApprovalRequest> {
      if (payoutPlan.fundedBy !== 'studio-treasury') {
        throw new Error('only studio-funded payout plans can be submitted for approval');
      }
      const now = nowIso();
      const request: PayoutApprovalRequest = {
        requestId: crypto.randomUUID(),
        seasonId: payoutPlan.seasonId,
        status: 'pending_review',
        payoutPlan: {
          ...payoutPlan,
          payouts: payoutPlan.payouts.map((p) => ({ ...p })),
        },
        createdAt: now,
        createdBy,
        updatedAt: now,
      };
      requests.set(request.requestId, request);
      return cloneRequest(request);
    },

    async get(requestId: string): Promise<PayoutApprovalRequest | null> {
      const request = requests.get(requestId);
      return request ? cloneRequest(request) : null;
    },

    async list(seasonId?: string): Promise<PayoutApprovalRequest[]> {
      return [...requests.values()]
        .filter((request) => !seasonId || request.seasonId === seasonId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(cloneRequest);
    },

    async approve(requestId: string, approvedBy: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'approved';
      request.approvedAt = nowIso();
      request.approvedBy = approvedBy;
      request.updatedAt = request.approvedAt;
      return cloneRequest(request);
    },

    async reject(requestId: string, rejectedBy: string, reason: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'rejected';
      request.rejectedAt = nowIso();
      request.rejectedBy = rejectedBy;
      request.rejectionReason = reason;
      request.updatedAt = request.rejectedAt;
      return cloneRequest(request);
    },

    async cancel(requestId: string, cancelledBy: string, reason: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'cancelled';
      request.cancelledAt = nowIso();
      request.cancelledBy = cancelledBy;
      request.cancellationReason = reason;
      request.updatedAt = request.cancelledAt;
      return cloneRequest(request);
    },

    async attachExecutionSignature(requestId: string, txSignature: string, actor: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      if (request.status !== 'approved') throw new Error('payout request must be approved before execution');
      if (request.executionTxSignature) throw new Error('payout request already has execution signature');
      request.executionTxSignature = txSignature;
      request.updatedAt = nowIso();
      // actor retained for audit; the Postgres adapter records it durably.
      void actor;
      return cloneRequest(request);
    },

    _reset(): void {
      requests.clear();
    },
  };
}

/**
 * Process-wide in-memory payout approvals (local dev/tests + memory storage
 * mode). In postgres storage mode, routes use the durable adapter via
 * pvpStorage instead. Exposed directly so unit tests can drive it.
 */
export const payoutApprovals = createMemoryPayoutApprovalRepository();
```


---

## apps/server/src/pvp/treasuryPayoutPreflight.ts

```ts
import type { PayoutApprovalRequest } from './payoutApproval.js';

export type TreasuryPayoutPreflightResult = {
  ok: true;
  requestId: string;
  seasonId: string;
  recipientCount: number;
  totalAmountRaw: string;
};

export function validateTreasuryPayoutPreflight(request: PayoutApprovalRequest): TreasuryPayoutPreflightResult {
  if (request.status !== 'approved') throw new Error('payout request must be approved before treasury execution');
  if (request.executionTxSignature) throw new Error('payout request already executed');
  if (request.payoutPlan.fundedBy !== 'studio-treasury') throw new Error('payout plan must be studio-funded');

  const seen = new Set<string>();
  let total = 0n;
  for (const payout of request.payoutPlan.payouts) {
    if (!payout.playerId.trim()) throw new Error('payout playerId required');
    if (seen.has(payout.playerId)) throw new Error(`duplicate payout recipient: ${payout.playerId}`);
    seen.add(payout.playerId);
    if (!/^\d+$/.test(payout.amountRaw)) throw new Error(`invalid amountRaw for ${payout.playerId}`);
    const amount = BigInt(payout.amountRaw);
    if (amount <= 0n) throw new Error(`non-positive payout for ${payout.playerId}`);
    total += amount;
  }

  if (total > BigInt(request.payoutPlan.prizePoolRaw)) {
    throw new Error('payout total exceeds configured prize pool');
  }

  return {
    ok: true,
    requestId: request.requestId,
    seasonId: request.seasonId,
    recipientCount: request.payoutPlan.payouts.length,
    totalAmountRaw: total.toString(),
  };
}
```


---

## apps/server/src/security/rateLimit.ts

```ts
export type FixedWindowRateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type RateLimitResult = {
  allowed: boolean;
  name: string;
  key: string;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterMs: number;
};

type Bucket = {
  count: number;
  resetAtMs: number;
};

export type FixedWindowRateLimiter = ReturnType<typeof createFixedWindowRateLimiter>;

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
}

export function createFixedWindowRateLimiter(options: FixedWindowRateLimitOptions) {
  assertPositiveInteger('limit', options.limit);
  assertPositiveInteger('windowMs', options.windowMs);

  const buckets = new Map<string, Bucket>();
  const now = options.now ?? (() => Date.now());

  function consume(key: string, cost = 1): RateLimitResult {
    assertPositiveInteger('cost', cost);
    const safeKey = key.trim() || 'anonymous';
    const nowMs = now();
    const existing = buckets.get(safeKey);
    const bucket = !existing || existing.resetAtMs <= nowMs
      ? { count: 0, resetAtMs: nowMs + options.windowMs }
      : existing;

    const nextCount = bucket.count + cost;
    const allowed = nextCount <= options.limit;
    if (allowed) {
      bucket.count = nextCount;
      buckets.set(safeKey, bucket);
    } else {
      // Keep the bucket so repeated rejected requests share the same reset time.
      buckets.set(safeKey, bucket);
    }

    return {
      allowed,
      name: options.name,
      key: safeKey,
      limit: options.limit,
      remaining: Math.max(0, options.limit - (allowed ? bucket.count : bucket.count)),
      resetAt: new Date(bucket.resetAtMs).toISOString(),
      retryAfterMs: Math.max(0, bucket.resetAtMs - nowMs),
    };
  }

  function reset(key?: string): void {
    if (key) buckets.delete(key);
    else buckets.clear();
  }

  function snapshot(): Array<{ key: string; count: number; resetAt: string }> {
    return [...buckets.entries()].map(([key, bucket]) => ({
      key,
      count: bucket.count,
      resetAt: new Date(bucket.resetAtMs).toISOString(),
    }));
  }

  return { consume, reset, snapshot };
}

export function rateLimitKey(scope: string, id: string): string {
  return `${scope}:${id.trim() || 'anonymous'}`;
}
```
