# Verification Report - PvP Launch Gating

Date: 2026-06-15

## Scope

Aligned the client with the accepted launch plan: mainnet prototype launch is
game-first and cosmetics-only, while PvP remains a post-launch no-prize beta.

Changes:

- Added `VITE_PVP_ENABLED`, defaulting false.
- Town hides the Arena entry unless `VITE_PVP_ENABLED=true`.
- Launch readiness rejects mainnet builds that expose PvP unless
  `ALLOW_MAINNET_PVP_BETA=true`.
- Docs now call out the default hidden Arena / no-prize beta opt-in.

No PvP prize claim, staking, betting, player-funded pool, or token reward path
was added.

## Verification

```text
node_modules\.bin\tsc.CMD -p apps\client\tsconfig.json --noEmit
  -> passed

apps\client\node_modules\.bin\vitest.CMD run src/services/launchNavigation.test.ts src/services/launchNotice.test.ts
  -> 2 test files passed, 4 tests passed

LAUNCH_TARGET=mainnet with VITE_PVP_ENABLED=true and no ALLOW_MAINNET_PVP_BETA
  -> failed as expected: VITE_PVP_ENABLED must be false for mainnet prototype launch unless ALLOW_MAINNET_PVP_BETA=true
```

Full-suite verification is recorded in the final command run for this pass.

```text
node scripts\agent-preflight.mjs
  -> agent-preflight passed

node scripts\architecture-guard.mjs
  -> architecture-guard passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json --noEmit
  -> passed

node_modules\.bin\tsc.CMD -p apps\client\tsconfig.json --noEmit
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json --noEmit
  -> passed

apps\server\node_modules\.bin\vitest.CMD run
  -> 15 test files passed, 70 tests passed

apps\client\node_modules\.bin\vitest.CMD run
  -> 10 test files passed, 35 tests passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json
  -> passed

apps\client\node_modules\.bin\tsc.CMD --noEmit; apps\client\node_modules\.bin\vite.CMD build
  -> built successfully; Vite retained the existing large chunk warning

node scripts\launch-smoke.mjs
  -> launch-smoke passed

LAUNCH_TARGET=devnet node scripts\launch-readiness.mjs
  -> launch-readiness passed for devnet

LAUNCH_TARGET=mainnet node scripts\launch-readiness.mjs
  -> launch-readiness passed for mainnet
```
