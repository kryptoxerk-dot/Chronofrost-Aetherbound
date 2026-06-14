# CODEX START HERE — Chronofrost: Aetherbound

This package is prepared for Codex / coding-agent work. Start here, then read `AGENTS.md`, `AGENT_CONTEXT_BUNDLE.md`, and the task file you are assigned.

## Product summary

Chronofrost: Aetherbound is a free-to-try browser GameBoy-style pixel RPG with optional Solana `$AETHER` cosmetic purchases, ranked PvP, anti-sybil eligibility, and studio-funded season rewards.

## Non-negotiable product invariants

- No player staking.
- No player-funded prize pool.
- No PvP betting or wagering.
- No entry fee that feeds rewards.
- PvP rewards, if enabled, are studio-funded only.
- `$AETHER` early utility is cosmetics, profile identity, founder items, and optional community access.
- The backend must never move player tokens without a player-signed transaction.
- The browser must never decide ranked PvP winners, ratings, eligibility, payouts, or prize-pool configuration.

## First commands

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --frozen-lockfile
pnpm agent:context
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
```

If dependencies are unavailable, run the offline checks:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
tsc -p packages/shared/tsconfig.json --noEmit
```

## Recommended next task

Start with:

```text
.codex/tasks/001-postgres-pvp-repositories.md
```

Reason: PvP ratings, eligibility, season snapshots, and payout plans must become durable before public ranked seasons or real `$AETHER` prize planning.

## Codex working rules

1. Make one focused change per pass.
2. Do not combine Postgres persistence, client PvP UI, payout execution, and Colyseus in one patch.
3. Keep in-memory adapters for tests/local dev.
4. Add or update tests for changed behavior.
5. Run `pnpm verify:agent` before claiming success.
6. Update verification docs with exact commands and results.
7. Preserve the architecture guard scripts; expand them if new high-risk invariants are added.

## High-risk files to handle carefully

```text
apps/server/src/routes/pvp.ts
apps/server/src/pvp/matchmaking.ts
apps/server/src/pvp/eligibility.ts
apps/server/src/pvp/season.ts
apps/server/src/pvp/payoutApproval.ts
apps/server/src/pvp/treasuryPayoutPreflight.ts
apps/server/src/pvp/adapters/postgresRepositories.ts
apps/server/src/solana/verifyPurchaseTransaction.ts
resources/pvp_database_schema.sql
AGENTS.md
scripts/architecture-guard.mjs
```

## Forbidden changes

Do not reintroduce:

```text
POST /pvp/match
client-supplied p1/p2/winner/rating/prize-pool config
public payout planning routes
player-to-player token wagering
entry fees feeding prize pools
automatic treasury transfers before admin approval and signed execution
```

## Definition of done for Codex patches

A patch is not done until:

```text
pnpm agent:preflight passes
pnpm architecture:guard passes
pnpm typecheck passes
pnpm test passes
pnpm build passes
pnpm verify:agent passes
relevant docs/tests are updated
```

If a full dependency install cannot run in the environment, say so clearly and report only the checks that actually ran.
