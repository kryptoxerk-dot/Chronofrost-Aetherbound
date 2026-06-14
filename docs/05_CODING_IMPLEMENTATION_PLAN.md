# 05 — Coding Implementation Plan

## Repo layout

```text
apps/client = playable Phaser browser game
apps/server = Fastify API for auth/shop/inventory
packages/shared = recommended future shared schemas/config
scripts = devnet token setup scripts
```

## Implementation priorities

### Priority 1: keep the game runnable

Every feature must preserve:

```bash
pnpm dev:client
pnpm dev:server
```

### Priority 2: keep Web3 optional

The game must not crash if:

```text
Phantom is not installed
AETHER_MINT is not configured
backend is offline
player has no token account
```

### Priority 3: keep all values configurable

Put these in config files:

```text
hero stats
enemy stats
skill costs
shop prices
XP curve
reward amounts
RPC URL
mint address
API base URL
```

## Suggested coding sequence

```text
1. Client boot
2. Town movement
3. Game state store
4. NPC dialogue
5. Battle system pure TypeScript
6. Battle scene UI
7. Dungeon scene
8. Shop scene
9. Server health/items
10. Server quote/confirm
11. Wallet connector
12. Devnet token scripts
13. Tests
14. Deploy configs
```

## Files worth reviewing first

```text
apps/client/src/systems/combat.ts
apps/client/src/systems/gameState.ts
apps/client/src/scenes/TownScene.ts
apps/client/src/scenes/BattleScene.ts
apps/client/src/solana/wallet.ts
apps/server/src/routes/shop.ts
apps/server/src/solana/verifyPurchaseTransaction.ts
```

## Required tests before mainnet

```text
combat damage formula
freeze turn delay
quest persistence
quote expiry
duplicate tx rejection
wrong mint rejection
wrong treasury rejection
wrong amount rejection
wrong memo rejection
auth nonce replay rejection
```

## Mainnet blocker list

Do not use real funds until:

```text
Postgres ledger implemented
order idempotency tested
transaction verification tested against real devnet txs
server secrets isolated
treasury hot wallet limits set
legal/compliance review completed
token messaging cleaned of ROI language
anti-bot plan implemented for any tradable rewards
```
