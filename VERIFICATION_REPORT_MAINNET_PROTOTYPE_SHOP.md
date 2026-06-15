# Verification Report - Mainnet Prototype Shop Hardening

Date: 2026-06-15

## Scope

Implemented the first mainnet-prototype launch slice from the accepted plan:

- stabilize the prior SIWS auth rate-limit continuation;
- add durable cosmetic shop storage behind repository-style interfaces;
- add operator/admin purchase controls that keep guest play and catalog browsing online;
- wire Render/Postgres deployment to persist cosmetic orders and inventory grants.

No player staking, player-funded prizes, PvP betting, reward claims, NFT minting,
or backend movement of player tokens was added.

## Files changed

- `apps/server/src/shop/*` - shop repository contract, memory adapter, Postgres
  adapter, storage composition root, and adapter tests.
- `apps/server/src/routes/shop.ts` - `/shop/quote` and `/shop/confirm` now use
  the active shop repository; added `/admin/shop/status` purchase kill switch.
- `resources/pvp_database_schema.sql` - idempotent `shop_orders` and
  `shop_inventory_grants` tables.
- `apps/server/src/config/env.ts`, `.env.example`, `render.yaml` - shop storage
  and purchase-control env.
- `docs/14_DEPLOYMENT_RUNBOOK.md`, `docs/api/openapi.yaml`,
  `docs/22_CONSOLIDATED_DEV_PLAN.md` - launch/runbook/API status updates.
- `VERIFICATION_REPORT_AUTH_RATE_LIMITS.md` - retained prior auth pass report.

## Verification

`pnpm` is not available on PATH in this shell, so package-local binaries and the
repo's Node fallback scripts were used.

```text
node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json --noEmit
  -> passed

apps\server\node_modules\.bin\vitest.CMD run src/routes/shop.test.ts src/shop/adapters/memoryShopRepository.test.ts src/shop/adapters/postgresShopRepository.test.ts src/routes/auth.test.ts
  -> 4 test files passed, 9 tests passed

apps\server\node_modules\.bin\vitest.CMD run
  -> 15 test files passed, 70 tests passed

node_modules\.bin\tsc.CMD -p apps\client\tsconfig.json --noEmit
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json --noEmit
  -> passed

node scripts\agent-preflight.mjs
  -> agent-preflight passed

node scripts\architecture-guard.mjs
  -> architecture-guard passed

apps\client\node_modules\.bin\vitest.CMD run
  -> 6 test files passed, 23 tests passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json
  -> passed

apps\client\node_modules\.bin\tsc.CMD --noEmit; apps\client\node_modules\.bin\vite.CMD build
  -> built successfully; Vite retained the existing large chunk warning

node scripts\agent-context-pack.mjs
  -> wrote AGENT_CONTEXT_BUNDLE.md
```

## Remaining plan work

- Content/onboarding polish for the prototype launch dungeon.
- Mainnet dry run with official `$AETHER` mint and a tiny fixed-price cosmetic.
- Optional 429 logging / Redis rate limiter for multi-instance production.
- PvP remains post-launch beta/no-prize; treasury payout executor remains gated.
