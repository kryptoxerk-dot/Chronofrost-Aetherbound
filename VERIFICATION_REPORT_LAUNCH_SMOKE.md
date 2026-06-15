# Verification Report - Launch Smoke Automation

Date: 2026-06-15

## Scope

Added local launch smoke automation for the mainnet prototype plan. The smoke
test starts the built server in safe memory mode with cosmetic purchases
disabled and verifies:

- server health;
- active cosmetic catalog;
- `$AETHER` quote endpoint returns the expected paused response;
- admin shop status reports purchases disabled;
- inventory reads stay online;
- static client build assets exist.

The smoke path does not require Postgres, Solana config, wallet access, or token
transfers. It does not add staking, betting, rewards, prize claims, or backend
movement of player tokens.

## Files changed

- `scripts/launch-smoke.mjs`
- `package.json`
- `docs/14_DEPLOYMENT_RUNBOOK.md`

## Verification

```text
node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json
  -> passed

apps\client\node_modules\.bin\tsc.CMD --noEmit; apps\client\node_modules\.bin\vite.CMD build
  -> built successfully; Vite retained the existing large chunk warning

node scripts\launch-smoke.mjs
  -> launch-smoke passed

node scripts\agent-preflight.mjs
  -> agent-preflight passed

node scripts\architecture-guard.mjs
  -> architecture-guard passed

apps\server\node_modules\.bin\vitest.CMD run
  -> 15 test files passed, 70 tests passed

apps\client\node_modules\.bin\vitest.CMD run
  -> 8 test files passed, 30 tests passed
```
