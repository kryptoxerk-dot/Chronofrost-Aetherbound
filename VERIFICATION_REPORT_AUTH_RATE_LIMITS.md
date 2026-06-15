# Verification Report - Auth SIWS Rate Limits

Date: 2026-06-15

## Scope

Continuation pass after Claude's deploy/wallet-code-splitting work. This adds
dependency-free fixed-window limits to the SIWS auth endpoints:

```text
POST /auth/nonce
POST /auth/verify
```

The limits are IP-scoped and enforced before request body parsing/signature
verification, so malformed bursts are throttled too. No wallet transfer,
payout, staking, betting, prize-pool, or PvP route behavior was changed.

## Files changed

- `apps/server/src/config/env.ts` - added auth rate-limit env parsing and
  `getAuthRateLimitConfig()`.
- `apps/server/src/routes/auth.ts` - applies `auth.nonce` and `auth.verify`
  fixed-window limiters with standard `x-ratelimit-*` headers.
- `apps/server/src/routes/auth.test.ts` - proves nonce and verify requests are
  throttled with `429`.
- `.env.example` - documents auth rate-limit defaults.
- `AGENT_CONTEXT_BUNDLE.md` - regenerated with `node scripts/agent-context-pack.mjs`.

## Verification

`pnpm` was not available on PATH in this shell, so package-local binaries and
the repo's Node fallback scripts were used.

```text
pnpm --filter @chronofrost/server test -- src/routes/auth.test.ts
  -> not run: pnpm command not found

pnpm --filter @chronofrost/server typecheck
  -> not run: pnpm command not found

node scripts/agent-preflight.mjs
  -> agent-preflight passed

node scripts/architecture-guard.mjs
  -> architecture-guard passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json --noEmit
  -> passed

apps\server\node_modules\.bin\vitest.CMD run src/routes/auth.test.ts
  -> 1 test file passed, 2 tests passed

apps\server\node_modules\.bin\vitest.CMD run
  -> 12 test files passed, 63 tests passed

node_modules\.bin\tsc.CMD -p apps\client\tsconfig.json --noEmit
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json --noEmit
  -> passed

apps\client\node_modules\.bin\vitest.CMD run
  -> 6 test files passed, 23 tests passed

node_modules\.bin\tsc.CMD -p apps\server\tsconfig.json
  -> passed

node_modules\.bin\tsc.CMD -p packages\shared\tsconfig.json
  -> passed

apps\client\node_modules\.bin\tsc.CMD --noEmit; apps\client\node_modules\.bin\vite.CMD build
  -> built successfully; Vite retained the existing large chunk warning

node scripts/agent-context-pack.mjs
  -> wrote AGENT_CONTEXT_BUNDLE.md
```

