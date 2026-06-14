# Fixes Applied to the Original Claude Plan

## 1. Purchase flow corrected

Original issue:

```text
server validates → transfer $AETHER to treasury → grant item
```

Why it is wrong:

```text
A backend cannot move tokens from a player's wallet unless the player signs the transfer or has previously delegated allowance. Treating the backend as able to transfer player funds is a critical design bug.
```

Fixed flow:

```text
1. Client requests quote from server.
2. Server creates an order with itemId, mint, price, treasury token account, nonce, and expiry.
3. Player wallet signs and sends the SPL token transfer.
4. Transfer includes orderId in Memo.
5. Client sends tx signature to server.
6. Server verifies the confirmed transaction on Solana.
7. Server grants the item once, idempotently.
```

## 2. Guest-first browser game added

Original plan risk: wallet-first onboarding.  
Fixed plan: players can try the browser demo immediately, then optionally connect wallet to save, claim, or buy cosmetics.

## 3. Tradable token separated from gameplay currency

Original risk: earning `$AETHER` from dungeons attracts farmers before real players.  
Fixed economy:

```text
Gold / Frost Shards = off-chain gameplay rewards
$AETHER = optional cosmetic spend token
```

## 4. Stronger game hook added

Original combat was generic turn-based RPG.  
Fixed design adds **Chronofrost Timeline**:

```text
Freeze = delay enemy turn
Thaw = accelerate ally turn
Fracture = interrupt enemy charged attack
Rewind = limited undo of last damage event
Aether Surge = immediate action meter
```

## 5. Pump.fun launch repositioned

Original plan treated token launch as parallel and easy.  
Fixed plan allows Pump.fun launch but gates risky game integrations:

```text
Launch token only with transparent utility messaging.
No ROI language.
No paid token-earning boosts.
No dungeon token rewards before anti-cheat and legal review.
```

---

## Post-review fixes (verified by Claude with tsc + vitest)

- FIX (blocking): added `.js` extensions to all server relative imports and typed
  one implicit-any param. Server now compiles (`tsc --noEmit` exit 0). The package
  previously did not compile as shipped.
- FIX (security): closed a nonce replay race in `/auth/verify` by claiming the
  nonce atomically before the async signature verify (`store.claimNonce`).
- ADDED: VERIFICATION_REPORT.md documenting what was tested and the results.
- NOTE: boss combat is unwinnable by attack-only (freeze mechanic required) — a
  balance tuning decision flagged for the 5-minute demo, not a code bug.


---

## Second-pass hardening and CI additions

- ADDED: centralized client scene registry (`SCENE_KEYS`) and replaced hardcoded scene navigation strings.
- FIXED: battle scene now pauses timeline advancement while the hero is ready; this makes the first browser demo feel more like a simple GameBoy turn-based RPG and prevents enemies from auto-acting while the player reads commands.
- ADDED: executable client tests for combat, game state, and scene registry.
- HARDENED: client `gameState` now survives missing/failing localStorage and does not expose mutable internal state.
- HARDENED: client purchase builder now rejects expired quotes and wallet/quote buyer mismatches before asking the wallet to sign.
- HARDENED: `/shop/confirm` now atomically claims pending orders before async Solana verification, preventing concurrent confirmation races.
- HARDENED: `/auth/nonce` and `/auth/verify` now validate Solana public keys and signature length/shape.
- ADDED: server tests for nonce claim idempotency, order confirmation claim idempotency, inventory idempotency, and purchase transaction verification failure cases.
- ADDED: GitHub Actions CI workflow plus `pnpm verify` / `pnpm ci` root scripts.
- ADDED: `docs/16_CI_AND_VERIFICATION.md` and `VERIFICATION_REPORT_SECOND_PASS.md`.

## PvP security patch

- Removed unsafe public `POST /pvp/match` endpoint.
- Added session-bound PvP identity via auth sessions.
- Added turn-by-turn PvP lifecycle: queue, active match state, action, forfeit, timeout claim.
- Added deterministic step-capable duel state to support server-authoritative PvP.
- Fixed `defend` so it reduces incoming damage and ripostes attack spam.
- Tuned `freeze` to avoid universal spam dominance.
- Randomized/seeded initiative so p1 is not hardcoded to act first.
- Moved season payout planning to admin-only config-backed endpoint.
- Added PvP Postgres target schema and security patch notes.

## Next phase — PvP eligibility and anti-sybil hardening

Added:

- `apps/server/src/pvp/eligibility.ts` for season prize eligibility decisions.
- `apps/server/src/pvp/eligibility.test.ts` for anti-sybil and payout gating tests.
- `apps/server/src/pvp/repositories.ts` with repository interfaces for the future Postgres adapter.
- Admin routes for eligibility reports, snapshots, flags, bans, clear-flag, and snapshot-backed payout planning.
- Player route `GET /pvp/me/eligibility`.
- Privacy-safe identity signal hashing hooks; raw IP/device/user-agent values are not stored by the eligibility layer.
- Payout planning now supports eligible snapshot players instead of raw leaderboard-only payouts.
- Expanded `resources/pvp_database_schema.sql` with flags, identity hashes, match quality metrics, season snapshot rows, and payout approval fields.
- `docs/18_PVP_ELIGIBILITY_AND_ANTI_SYBIL.md`.

Kept invariant:

- No player staking.
- No player-funded prize pool.
- No PvP betting.
- Studio-funded rewards only.

## Phase 5 — Agent-Ready Development Package

Added an agent-friendly build layer so future Claude/Codex passes can work from stable contracts instead of rediscovering project rules.

### Added

- Root `AGENTS.md` with non-negotiable Web3/PvP/token invariants.
- Codex task files in `.codex/tasks/`.
- Claude command handoff in `.claude/commands/phase-5-next.md`.
- OpenAPI contract at `docs/api/openapi.yaml`.
- Agent workflow docs at `docs/19_AGENT_WORKFLOW_AND_CODE_OWNERSHIP.md`.
- Next-phase backlog at `docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md`.
- Payout approval/rate-limit documentation at `docs/21_PAYOUT_APPROVAL_AND_RATE_LIMITING.md`.
- Agent scripts:
  - `scripts/agent-preflight.mjs`
  - `scripts/architecture-guard.mjs`
  - `scripts/agent-context-pack.mjs`
- Root scripts:
  - `pnpm agent:preflight`
  - `pnpm architecture:guard`
  - `pnpm agent:context`
  - `pnpm verify:agent`
- Dependency-free local rate limiter:
  - `apps/server/src/security/rateLimit.ts`
- Payout approval/preflight scaffold:
  - `apps/server/src/pvp/payoutApproval.ts`
  - `apps/server/src/pvp/treasuryPayoutPreflight.ts`
- Postgres adapter scaffold:
  - `apps/server/src/pvp/adapters/postgresRepositories.ts`
  - `apps/server/src/pvp/adapters/memoryRepositories.ts`
  - `apps/server/src/pvp/adapters/repositoryFactory.ts`
- Lightweight shared package:
  - `packages/shared`

### Changed

- PvP routes now apply local fixed-window limits to queue/action/admin-sensitive endpoints.
- Admin payout flow now supports creating approval requests, approving/rejecting/cancelling them, running treasury preflight, and recording an execution signature.
- Environment docs now include rate-limit and storage-adapter config.
- PvP database schema now includes payout-plan approval states and execution signature fields.

### Preserved

- No player staking.
- No PvP betting.
- No player-funded prize pools.
- Studio-funded rewards only.
