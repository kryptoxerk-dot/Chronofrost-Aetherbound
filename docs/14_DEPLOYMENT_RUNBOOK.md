# 14 — Deployment Runbook

## Local build

```bash
pnpm install
pnpm typecheck
pnpm build
```

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
Keep game playable in guest mode
Hide wallet shop button
Publish status update
Investigate server logs and order ledger
Re-enable only after fix and test
```
