# Verification Report — PvP Security Patch

Date: 2026-06-14

## Scope

This patch fixes the core PvP flaws from the previous package before repackaging:

- unsafe public one-shot match endpoint
- client-supplied p1/p2 identity
- missing session binding
- no turn-by-turn lifecycle
- weak `defend` action
- dominant `freeze` spam
- public prize-pool planning body
- missing persistence target schema

## Code changes

### PvP identity and lifecycle

- Removed `POST /pvp/match` from `apps/server/src/routes/pvp.ts`.
- Added session-bound endpoints:
  - `POST /pvp/queue`
  - `GET /pvp/me/active-match`
  - `GET /pvp/matches/:matchId/state`
  - `POST /pvp/matches/:matchId/action`
  - `POST /pvp/matches/:matchId/forfeit`
  - `POST /pvp/matches/:matchId/claim-timeout`
- Added `apps/server/src/auth/session.ts`.
- Added session token creation in `/auth/verify`.
- Added `apps/server/src/pvp/matchmaking.ts`.

### PvP combat

- Reworked `apps/server/src/pvp/duelEngine.ts` into a step-capable deterministic engine.
- Added server seed state, current-turn lookup, and action application.
- Removed hardcoded p1 initiative advantage by selecting initiative from the server seed.
- Fixed `defend` so it reduces the next incoming hit and ripostes attack spam.
- Tuned `freeze` down so it is tactical rather than universally dominant.

### Ranked ladder

- Added `ladder.recordResolvedMatch()` for turn-by-turn completed matches.
- Kept `ladder.resolveRanked()` for deterministic full-queue tests/replay.
- Added test helper for tamper-detection tests.

### Studio-funded payout planning

- Removed public request-body prize pool configuration.
- Added admin-only endpoint: `POST /admin/pvp/season/payout-plan`.
- Prize pool and distribution now load from server config/env only.
- Added env vars:
  - `PVP_ADMIN_TOKEN`
  - `PVP_SEASON_ID`
  - `PVP_PRIZE_POOL_RAW`
  - `PVP_PRIZE_DISTRIBUTION`
  - `PVP_TOKEN_DECIMALS`

### Persistence planning

- Added `resources/pvp_database_schema.sql` for the required Postgres replacement before public seasons/prizes.
- Added `docs/17_PVP_SECURITY_PATCH_NOTES.md`.
- Updated `docs/16_PVP_RANKED_DESIGN.md`.

## Verification executed in this sandbox

Full `pnpm install` / `pnpm verify` could not be executed here because the npm registry is unreachable from the sandbox and `pnpm` is not available locally.

Executed available checks with the globally available TypeScript compiler and Node runtime:

```bash
tsc --module NodeNext \
  --moduleResolution NodeNext \
  --target ES2022 \
  --strict \
  --noEmit \
  /mnt/data/node-crypto-shim.d.ts \
  apps/server/src/pvp/duelEngine.ts \
  apps/server/src/pvp/ladder.ts \
  apps/server/src/pvp/matchmaking.ts \
  apps/server/src/pvp/season.ts
```

Result: passed.

```bash
tsc --module NodeNext \
  --moduleResolution NodeNext \
  --target ES2022 \
  --strict \
  --noImplicitAny false \
  --noEmit \
  /mnt/data/external-shims.d.ts \
  apps/server/src/pvp/duelEngine.ts \
  apps/server/src/pvp/ladder.ts \
  apps/server/src/pvp/matchmaking.ts \
  apps/server/src/pvp/season.ts \
  apps/server/src/services/inMemoryStore.ts \
  apps/server/src/auth/session.ts \
  apps/server/src/config/env.ts \
  apps/server/src/routes/pvp.ts
```

Result: passed syntax/local-reference check with external dependency shims.

Dynamic deterministic simulation:

- `attack` beats `freeze` spam.
- `freeze` beats `defend` spam.
- `defend` beats `attack` spam.
- No single basic spam strategy dominates all other basic strategies.
- Non-participant match action submission throws.
- Wrong-turn match action submission throws.
- Current-turn action advances server state.

## Required local verification on a networked machine

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --frozen-lockfile
pnpm verify
```

If dependency versions drift, use this once, then commit the lockfile:

```bash
pnpm install --no-frozen-lockfile
pnpm verify
```

## Remaining blockers before real $AETHER prizes

- Replace in-memory PvP stores with Postgres using `resources/pvp_database_schema.sql`.
- Add rate limits and abuse monitoring.
- Add anti-sybil eligibility rules for ranked rewards.
- Add admin approval workflow for payout plans.
- Add a separate signed treasury payout executor.
- Complete jurisdiction-specific legal/compliance review.
