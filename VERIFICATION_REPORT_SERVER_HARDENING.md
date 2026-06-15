# Verification Report — Server Production Hardening

Date: 2026-06-15

## Scope

Make the API production-ready: security headers, sanitized error handling, a
testable app factory, fail-fast production config validation, and configurable
logging. No public route contract changed.

## Changes

- `apps/server/src/app.ts` — new `buildServer()` factory (construction separated
  from `listen`): registers `@fastify/helmet` (security headers), CORS, storage
  init + ladder rehydration, a sanitized error handler (no 5xx internal leak in
  production), and a JSON 404 handler. `bodyLimit` 256 KB; `trustProxy` so
  `req.ip` is correct behind a PaaS load balancer (rate-limit accuracy).
- `apps/server/src/index.ts` — slimmed to a bootstrap: `assertProductionConfig()`
  → `buildServer()` → `listen()`, with graceful shutdown.
- `apps/server/src/config/env.ts` — `LOG_LEVEL`; `isProduction()`;
  `productionConfigProblems()` / `assertProductionConfig()` (reject the dev
  SESSION_SECRET / secrets < 16 chars / postgres without DATABASE_URL).
- `apps/server/package.json` — `@fastify/helmet@^11` (Fastify 4 compatible).
- `.env.example` — documents `LOG_LEVEL` and the production secret requirement.
- Tests: `app.test.ts` (helmet headers, JSON 404, 413 on oversized body),
  `config/env.test.ts` (production config validation).

## Verification

```text
pnpm --filter @chronofrost/server typecheck -> Done
pnpm -r test                                 -> 80 server tests pass (+8); client unchanged
node scripts/agent-preflight.mjs             -> passed
node scripts/architecture-guard.mjs          -> passed
pnpm -r build                                -> built
```

Production-boot smoke (built artifact):

```text
NODE_ENV=production, SESSION_SECRET=dev-only-change-me  -> boot REFUSED (exit 1,
  "Unsafe production configuration")
NODE_ENV=production, strong SESSION_SECRET              -> /health 200 with
  x-content-type-options: nosniff and x-frame-options: SAMEORIGIN
```

## Notes

- CSP is disabled in helmet because this is a JSON API behind a separate static
  client (a response CSP would not protect the SPA); all other helmet headers
  stay on.
- The boot-time guard complements the existing `launch-readiness.mjs` static
  check — now unsafe production secrets also stop the server from starting.
