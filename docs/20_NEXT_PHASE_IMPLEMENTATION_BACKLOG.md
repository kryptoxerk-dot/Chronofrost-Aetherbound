# Next Phase Implementation Backlog

Status note as of 2026-06-15: Phases 5A, 5C, 5D, and 5E have been implemented
for the current prototype scope. Phase 5B auth route limiting and repeated-429
operator logging are implemented; multi-instance Redis limiting remains
optional post-launch hardening. The mainnet prototype is launch-gated by the
external evidence checklist in `docs/24_GO_LIVE_EVIDENCE.md`.

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
