# Verification Report - Launch Readiness Gates

Date: 2026-06-15

## Scope

Added static environment readiness checks for devnet/mainnet prototype launch.
The new script validates:

- client/server Solana cluster alignment;
- non-placeholder session/admin secrets;
- reliable RPC URLs;
- explicit PvP/shop storage modes;
- durable Postgres shop storage for mainnet purchases;
- mint/treasury config when purchases are enabled;
- `PVP_PRIZE_POOL_RAW=0` for mainnet prototype launch.

The script never signs transactions, never touches player wallets, and never
sends tokens.

## Files changed

- `scripts/launch-readiness.mjs`
- `package.json`
- `docs/14_DEPLOYMENT_RUNBOOK.md`
- `resources/environment_variables.md`

## Verification

```text
LAUNCH_TARGET=devnet node scripts\launch-readiness.mjs
  -> launch-readiness passed for devnet
  -> warning: memory shop storage is devnet/local only

LAUNCH_TARGET=mainnet node scripts\launch-readiness.mjs
  -> launch-readiness passed for mainnet

LAUNCH_TARGET=mainnet with PVP_PRIZE_POOL_RAW=100 node scripts\launch-readiness.mjs
  -> failed as expected: PvP prizes are post-launch gated
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
  -> 8 test files passed, 30 tests passed

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
