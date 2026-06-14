# 03 — Technical Architecture

## Recommended stack

```text
Client: Vite + Phaser 3 + TypeScript
Server: Node.js + Fastify + TypeScript
Database: Postgres later; in-memory only for local prototype
Solana: @solana/web3.js + @solana/spl-token
Auth: Sign-In with Solana style nonce/signature flow
Deployment: Vercel/Netlify for client, Railway/Fly.io/Render for backend
```

## Architecture

```text
Browser client
  ├─ Phaser scenes
  ├─ game state store
  ├─ local save
  ├─ wallet adapter / Phantom prototype connector
  └─ API client

Fastify server
  ├─ auth nonce + verify
  ├─ shop item config
  ├─ order quote creation
  ├─ transaction verification
  ├─ inventory grants
  └─ economy ledger later

Solana devnet/mainnet
  ├─ $AETHER mint
  ├─ player token accounts
  ├─ treasury token account
  └─ memo/order verification
```

## Client scene structure

```text
BootScene       generates placeholder textures and starts the game
TownScene       movement, NPCs, shop entrance, dungeon gate
DungeonScene    room progression and dungeon encounters
BattleScene     turn-based combat and Chronofrost mechanic
ShopScene       off-chain shop + optional $AETHER purchase prompt
UIOverlayScene  HUD for HP, gold, quest, wallet status
```

## Server endpoint contract

### Health

```http
GET /health
```

### Auth nonce

```http
POST /auth/nonce
{ "wallet": "..." }
```

Returns:

```json
{ "nonce": "...", "message": "...", "expiresAt": "..." }
```

### Auth verify

```http
POST /auth/verify
{ "wallet": "...", "signature": [...], "nonce": "..." }
```

Prototype server includes a safe route contract. Production should use SIWS-compatible message formatting and httpOnly secure cookies.

### Items

```http
GET /shop/items
```

### Quote

```http
POST /shop/quote
{ "wallet": "...", "itemId": "founder_palette" }
```

Returns:

```json
{
  "orderId": "...",
  "itemId": "founder_palette",
  "buyerWallet": "...",
  "mint": "...",
  "amountRaw": "1000000",
  "decimals": 6,
  "treasuryTokenAccount": "...",
  "expiresAt": "..."
}
```

### Confirm

```http
POST /shop/confirm
{ "orderId": "...", "txSignature": "..." }
```

The server must verify:

```text
order exists
order not expired
order not already paid
tx not previously used
tx confirmed/finalized
correct token mint
correct amount
correct destination treasury token account
correct buyer authority/source owner when available
memo includes orderId
```

## Database tables for production

See `resources/database_schema.sql`.

Minimum tables:

```text
users
sessions
players
items
orders
inventory_items
economy_ledger
combat_runs
```

## Why not full on-chain shop in MVP?

A full Anchor shop program is cleaner for mainnet because payment and receipt can be atomic. For a 7-day demo, quote-confirm is faster and safer than the broken “server transfers player tokens” approach. Once real value is involved, upgrade to an audited Anchor `buy_item` instruction.

## Upgrade path

```text
Prototype: off-chain item grants + verified player-signed transfers
Closed beta: Postgres ledger + deterministic combat replay
Mainnet beta: Anchor shop program + transaction indexing
Launch: optional NFT/cNFT cosmetic claims after wallet/marketplace compatibility review
```
