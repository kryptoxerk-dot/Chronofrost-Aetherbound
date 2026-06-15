# 14 — Deployment Runbook

## Fast go-live (recommended) — Render Blueprint

The repo ships `render.yaml`, a one-shot blueprint that provisions Postgres, the
API, and the static client and auto-wires the cross-service URLs.

```text
1. Push this repo to GitHub.
2. Render Dashboard -> New -> Blueprint -> select the repo -> Apply.
3. Render builds all three services and runs the schema migration
   (scripts/migrate-pvp.mjs) on the server's first start.
```

What auto-wires:
- `DATABASE_URL` from the managed Postgres.
- `SESSION_SECRET`, `PVP_ADMIN_TOKEN`, `PVP_FINGERPRINT_SALT` are generated.
- Client `VITE_API_BASE_URL` = server host; server `CORS_ORIGIN` = client host
  (scheme-less hosts are normalized to https in app code).
- `SHOP_STORAGE_ADAPTER=postgres` persists cosmetic orders and inventory grants
  in the same database as PvP storage.

What to set yourself (optional, for the Solana shop): `AETHER_MINT`,
`TREASURY_WALLET`, `TREASURY_TOKEN_ACCOUNT`. Leave unset for a guest + PvP launch.

Health check: `GET /health` -> `{ "ok": true, "service": "chronofrost-server" }`.

### Alternative — container hosts (Railway / Fly.io / Render-Docker)

`apps/server/Dockerfile` builds and runs the API (build context = repo root):

```bash
docker build -f apps/server/Dockerfile -t chronofrost-server .
docker run -e DATABASE_URL=... -e PVP_STORAGE_ADAPTER=postgres -e PORT=8787 -p 8787:8787 chronofrost-server
```

Run the migration once against the DB before/at first deploy:

```bash
DATABASE_URL=postgres://... pnpm migrate:pvp
```

The server binds the host-injected `PORT` (falls back to `SERVER_PORT=8787`).
Deploy the client (`apps/client/dist`) to any static host (Vercel/Netlify/Render
static); set `VITE_API_BASE_URL` to the API URL at build time.

### Launch storage modes

- `PVP_STORAGE_ADAPTER=memory` — fastest, no DB. Ranked state resets on restart.
- `PVP_STORAGE_ADAPTER=postgres` + `DATABASE_URL` — durable; ratings/matches
  survive restarts (ladder rehydrates from Postgres on boot).

## Local build

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm smoke:launch
```

`pnpm smoke:launch` starts the built API locally in memory mode with purchases
disabled, checks `/health`, `/shop/items`, `/shop/quote` paused behavior,
`/admin/shop/status`, `/inventory/:wallet`, and confirms the client `dist`
assets exist. It does not require Postgres, Solana config, or wallet access.

## Client deployment

Recommended: Vercel or Netlify.

```text
Root directory: apps/client
Build command: pnpm build
Output directory: dist
```

Client env:

```text
VITE_API_BASE_URL=https://your-api.example.com
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_AETHER_MINT=<devnet mint>
VITE_TREASURY_TOKEN_ACCOUNT=<devnet treasury ATA>
```

## Server deployment

Recommended: Railway, Fly.io, Render, or a small VPS.

Server env:

```text
SERVER_PORT=8787
CORS_ORIGIN=https://your-game.example.com
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
AETHER_MINT=<devnet mint>
TREASURY_WALLET=<treasury wallet>
TREASURY_TOKEN_ACCOUNT=<treasury ATA>
SESSION_SECRET=<long random secret>
DATABASE_URL=<postgres url, when added>
SHOP_STORAGE_ADAPTER=postgres
SHOP_PURCHASES_ENABLED=true
```

Emergency cosmetic-shop rollback:

```text
Set SHOP_PURCHASES_ENABLED=false or call POST /admin/shop/status with
{ "purchasesEnabled": false, "reason": "..." } using x-admin-token.
The catalog, inventory reads, and guest game stay online; quote/confirm return 503.
```

## Mainnet launch env changes

Only after readiness gates:

```text
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=<paid/reliable RPC>
AETHER_MINT=<official Pump.fun token mint or chosen mint>
TREASURY_WALLET=<mainnet treasury public key>
TREASURY_TOKEN_ACCOUNT=<mainnet treasury ATA>
```

## Launch checklist

```text
Client deployed
Server deployed
Health endpoint live
Local smoke passed (`pnpm smoke:launch`)
CORS correct
RPC stable
Mint address configured
Treasury ATA exists
Test quote works
Test confirmed transfer works
Duplicate confirm rejected
Demo playthrough recorded
Official mint pinned
Risk disclaimer published
```

## Rollback plan

```text
Disable quote endpoint
or set SHOP_PURCHASES_ENABLED=false / POST /admin/shop/status
Keep game playable in guest mode
Hide wallet shop button
Publish status update
Investigate server logs and order ledger
Re-enable only after fix and test
```
