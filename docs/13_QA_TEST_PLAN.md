# 13 — QA and Test Plan

## Manual smoke test

```text
Open client
Move around town
Interact with quest NPC
Enter dungeon
Start battle
Use attack
Use freeze
Win battle
Clear dungeon
Return to town
Open shop
Buy gold cosmetic
Confirm shop says cosmetics only and wallet optional
Refresh page
Check inventory persists
```

## Wallet smoke test

```text
Open game with Phantom installed
Connect wallet
Show public key
Show $AETHER balance or clear “not configured/no token account” message
Request quote from backend
Sign transfer on devnet
Confirm purchase
See item in inventory
Duplicate confirm rejected
Confirm the displayed network is devnet or mainnet as configured
Disable purchases and confirm Gold shop/catalog still work while $AETHER quote returns paused copy
```

## Automated local verification

```bash
pnpm verify
# or
./scripts/verify-local.sh
```

This must pass before zipping, pushing, or deploying. It runs typecheck, unit tests, and build across client and server workspaces.

## Server tests

```text
GET /health returns ok
GET /shop/items returns active items
POST /shop/quote rejects invalid item
POST /shop/quote rejects missing wallet
POST /shop/confirm rejects unknown order
POST /shop/confirm rejects expired order
POST /shop/confirm rejects duplicate tx
nonce claim can only succeed once
order confirmation claim can only succeed once
inventory grant is idempotent by orderId and txSignature
purchase verifier rejects missing memo, wrong amount, wrong treasury, failed tx, and unknown tx
```

## Combat tests

```text
damage never below 1 unless defended/shielded rule says otherwise
freeze increases enemy delay
defend reduces incoming damage
attack-only boss strategy loses
freeze-based boss strategy wins
boss charge can be delayed
victory grants reward once
loss does not grant reward
```

## Performance requirements

```text
loads under 3 seconds on decent connection after cache
stable 60 FPS on normal laptop
no large asset downloads in prototype
no wallet popup on first load
```

## Security tests before mainnet

```text
replay same tx twice
use tx with wrong memo
use tx to wrong treasury
use tx with wrong mint
use tx with lower amount
confirm after quote expiry
confirm tx from a different wallet
try malformed signature string
try short or long signature array
try invalid Solana public key
try concurrent nonce verification
try concurrent order confirmation
try huge itemId string
```

## Playtest questions

```text
Did you understand what to do in the first 60 seconds?
Did the battle feel different from a generic RPG?
Did wallet connection feel optional?
Would you replay another dungeon?
Would cosmetics matter to you?
What confused you?
```
