# Verification Report — Lane B: Deploy + Go Live

Date: 2026-06-15

## Scope

Fastest safe path to a public deploy: one-shot Render Blueprint (Postgres + API +
static client), a portable server Dockerfile for container hosts, host `PORT`
binding, and auto-wired cross-service URLs. No gameplay/route contract changes.

## Files changed

- `render.yaml` — Render Blueprint: managed Postgres + Node API + static client.
  Auto-wires `DATABASE_URL` (fromDatabase), client `VITE_API_BASE_URL` and server
  `CORS_ORIGIN` (fromService host), generates secrets. Server start runs the
  idempotent migration then boots. SPA rewrite for the client.
- `apps/server/Dockerfile` + `.dockerignore` — two-stage build using
  `pnpm deploy --prod`; runtime ships dist + prod deps + resources + scripts.
- `apps/server/src/config/env.ts` — `PORT` (host-injected) support via
  `resolveServerPort()`; `resolveCorsOrigin()` normalizes a scheme-less host to
  https.
- `apps/server/src/index.ts` — bind `resolveServerPort()`, use `resolveCorsOrigin()`.
- `apps/client/src/config/gameConfig.ts` — `apiBaseUrl` normalizes a scheme-less
  host to https (lets a PaaS service binding be used directly).
- `apps/server/src/pvp/adapters/pgClient.ts` — schema path resolves across
  layouts (cwd + source-relative) so migration works native and in containers.
- `docs/14_DEPLOYMENT_RUNBOOK.md` — fast go-live steps (Render + Docker + modes).

## Verification

```text
pnpm -r typecheck                  -> Done (3 projects)
pnpm -r build                      -> built (shared + server + client)
node scripts/agent-preflight.mjs   -> agent-preflight passed
node scripts/architecture-guard.mjs-> architecture-guard passed
pnpm -r test                       -> 81 tests passed (server 61 + client 20)
```

Production smoke test (built artifact, memory adapter, PORT=8799):

```text
GET /health          -> 200 { ok: true, service: "chronofrost-server" }
GET /pvp/leaderboard  -> 200 [] (empty, public)
```

## Go-live options

- **Render Blueprint** (recommended): push to GitHub -> New Blueprint -> Apply.
  Provisions DB + API + client, runs migration, generates secrets.
- **Container** (Railway/Fly/Render-Docker): `apps/server/Dockerfile`, run
  `pnpm migrate:pvp` once; client to any static host.
- **Memory mode** for an even faster launch with no DB (ranked state is
  non-durable across restarts).

## Invariants preserved

- No staking/betting/player-funded pools. PvP rewards (if enabled) studio-funded
  + admin-gated. No treasury transfer added. Route contracts unchanged.

## Follow-ups (post-launch)

- Set Solana shop env (`AETHER_MINT`, `TREASURY_WALLET`, `TREASURY_TOKEN_ACCOUNT`)
  when enabling on-chain cosmetics.
- Lane B polish: wallet code-splitting (client bundle ~1.77 MB), content/balance.
- Lane C: SIWS nonce/verify rate limiting.
