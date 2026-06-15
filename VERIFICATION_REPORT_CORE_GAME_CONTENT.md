# Verification Report - Core Game Content Pass

Date: 2026-06-15

## Scope

Implemented the next game-first launch slice from the mainnet prototype plan:

- compact Frostglass Cavern route with three enemy archetypes, one shrine, and
  the Chrono Warden boss;
- added Crystal Golem enemy balance;
- persisted hero HP/MP across dungeon encounters so shrine recovery matters;
- kept all progression guest-playable and wallet-free.

No token rewards, staking, betting, prize claim, NFT minting, or paid power was
added.

## Files changed

- `apps/client/src/config/dungeonPlan.ts` - single source of truth for the
  compact launch dungeon route.
- `apps/client/src/config/balance.ts` - Crystal Golem enemy config.
- `apps/client/src/scenes/DungeonScene.ts` and `BattleScene.ts` - route
  rendering, shrine recovery, and battle vitals persistence.
- `apps/client/src/systems/gameState.ts` - wallet-free hero vitals helpers.
- `docs/02_GAME_DESIGN_DOCUMENT.md`, `docs/22_CONSOLIDATED_DEV_PLAN.md` -
  current content status.

## Verification

```text
node_modules\.bin\tsc.CMD -p apps\client\tsconfig.json --noEmit
  -> passed

apps\client\node_modules\.bin\vitest.CMD run src/config/dungeonPlan.test.ts src/systems/gameState.test.ts src/systems/combat.test.ts
  -> 3 test files passed, 10 tests passed
```

Full-suite verification is recorded in the final command run for this pass.

```text
node scripts\agent-preflight.mjs
  -> agent-preflight passed

node scripts\architecture-guard.mjs
  -> architecture-guard passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json --noEmit
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json --noEmit
  -> passed

apps\server\node_modules\.bin\vitest.CMD run
  -> 15 test files passed, 70 tests passed

apps\client\node_modules\.bin\vitest.CMD run
  -> 7 test files passed, 26 tests passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json
  -> passed

apps\client\node_modules\.bin\tsc.CMD --noEmit; apps\client\node_modules\.bin\vite.CMD build
  -> built successfully; Vite retained the existing large chunk warning
```
