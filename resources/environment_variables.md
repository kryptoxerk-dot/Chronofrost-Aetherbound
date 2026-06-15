# Environment Variables

## Client

```text
VITE_API_BASE_URL=http://localhost:8787
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_AETHER_MINT=<devnet mint>
VITE_TREASURY_TOKEN_ACCOUNT=<treasury ATA>
```

## Server

```text
SERVER_PORT=8787
CORS_ORIGIN=http://localhost:5173
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
AETHER_MINT=<devnet mint>
TREASURY_WALLET=<treasury wallet public key>
TREASURY_TOKEN_ACCOUNT=<treasury ATA>
SESSION_SECRET=<random secret>
DATABASE_URL=<postgres later>
PVP_STORAGE_ADAPTER=memory
SHOP_STORAGE_ADAPTER=memory
SHOP_PURCHASES_ENABLED=true
```

## Never expose

```text
private keys
seed phrases
mainnet treasury keypairs
RPC admin credentials
database passwords in frontend env
```

## PvP eligibility / anti-sybil variables

```text
PVP_SEASON_CUTOFF_AT=9999-12-31T00:00:00.000Z
PVP_MIN_ACCOUNT_AGE_DAYS=7
PVP_MIN_COMPLETED_MATCHES=30
PVP_MIN_UNIQUE_OPPONENTS=10
PVP_MAX_COUNTED_MATCHES_PER_OPPONENT=3
PVP_MAX_FORFEIT_RATE=0.2
PVP_SHORT_MATCH_MAX_ACTIONS=3
PVP_MAX_SHORT_MATCH_RATE=0.35
PVP_MAX_IDENTITY_CLUSTER_SIZE=3
PVP_FINGERPRINTING_ENABLED=false
PVP_FINGERPRINT_SALT=<random-secret-salt>
PVP_TEST_WALLET_PREFIXES=test-,dev-,wallet-route-
PVP_ADMIN_EXCLUDED_WALLETS=<comma-separated-wallets>
```

Privacy rule: if fingerprinting is enabled, the server stores salted hashes only. Do not store raw IP addresses or raw device fingerprints in normal PvP records.

## Phase 5 / agent-friendly next build

| Variable | Default | Purpose |
|---|---:|---|
| `PVP_STORAGE_ADAPTER` | `memory` | Switch for `memory` vs `postgres` PvP repositories. Use `postgres` for durable no-prize PvP beta. |
| `SHOP_STORAGE_ADAPTER` | `memory` | Switch for `memory` vs `postgres` cosmetic order/inventory storage. Use `postgres` before public mainnet purchases. |
| `SHOP_PURCHASES_ENABLED` | `true` | Operator kill switch for `$AETHER` quote/confirm. Catalog and inventory reads stay online when false. |
| `PVP_QUEUE_RATE_LIMIT_MAX` | `12` | Max queue requests per wallet per window. |
| `PVP_QUEUE_RATE_LIMIT_WINDOW_MS` | `60000` | Queue rate-limit window. |
| `PVP_ACTION_RATE_LIMIT_MAX` | `60` | Max action/forfeit/timeout requests per wallet per window. |
| `PVP_ACTION_RATE_LIMIT_WINDOW_MS` | `60000` | PvP action rate-limit window. |
| `PVP_ADMIN_RATE_LIMIT_MAX` | `60` | Max admin endpoint requests per admin key/IP per window. |
| `PVP_ADMIN_RATE_LIMIT_WINDOW_MS` | `60000` | Admin rate-limit window. |
| `AUTH_NONCE_RATE_LIMIT_MAX` | `20` | Max SIWS nonce requests per IP per window. |
| `AUTH_NONCE_RATE_LIMIT_WINDOW_MS` | `60000` | SIWS nonce rate-limit window. |
| `AUTH_VERIFY_RATE_LIMIT_MAX` | `20` | Max SIWS verify requests per IP per window. |
| `AUTH_VERIFY_RATE_LIMIT_WINDOW_MS` | `60000` | SIWS verify rate-limit window. |

## Launch readiness commands

```bash
LAUNCH_TARGET=devnet node scripts/launch-readiness.mjs
LAUNCH_TARGET=mainnet node scripts/launch-readiness.mjs
```

Mainnet readiness requires durable shop storage, non-placeholder secrets,
official mint/treasury config, matching client/server cluster values, and
`PVP_PRIZE_POOL_RAW=0` for the prototype launch.

Production should also use edge/CDN limits and durable rate-limit storage if the API runs on more than one server instance.
