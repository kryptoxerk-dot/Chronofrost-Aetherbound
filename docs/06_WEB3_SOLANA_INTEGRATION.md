# 06 — Web3 / Solana Integration

## Principle

Web3 is optional infrastructure, not the gameplay core. The player can complete the demo without wallet connection.

## Prototype wallet flow

```text
Player plays as guest
→ clicks Connect Wallet when ready
→ wallet public key appears in HUD
→ game optionally reads devnet $AETHER balance
→ player can test devnet cosmetic purchase
```

## Auth flow

Use a nonce-based wallet signature flow. For production, use Sign-In with Solana compatible fields:

```text
domain
wallet address
statement
nonce
issuedAt
expirationTime
chain/cluster
URI
```

After verification, use an httpOnly secure SameSite cookie or short-lived server session. Do not store powerful auth tokens in localStorage.

## Correct purchase flow

```text
Client -> Server: POST /shop/quote { wallet, itemId }
Server -> Client: orderId, itemId, price, mint, amountRaw, treasuryTokenAccount, expiresAt
Client: builds SPL transferChecked from player token account to treasury token account
Client: adds Memo(orderId)
Client: wallet signs and sends transaction
Client -> Server: POST /shop/confirm { orderId, txSignature }
Server: fetches confirmed tx
Server: verifies mint, amount, buyer, treasury, memo, expiry, duplicate status
Server: grants item once
```

## What the server must never do

```text
Never ask for seed phrase.
Never ask for player private key.
Never sign transactions as the player.
Never claim it can transfer from player wallet without player signature/delegation.
Never put treasury private key in client.
```

## Token account logic

For purchases:

```text
buyer ATA = associated token account for buyer wallet + AETHER_MINT
treasury ATA = associated token account for treasury wallet + AETHER_MINT
transferChecked amount = integer raw amount based on mint decimals
```

## Mainnet upgrade

The quote-confirm flow is acceptable for prototype. For real value, consider an audited Anchor program:

```rust
buy_item(ctx, item_id, amount)
```

The program would:

```text
verify item price
transfer SPL token from buyer to treasury atomically
emit purchase receipt event
prevent replay
```

Backend then indexes receipts and mirrors inventory.

## Devnet testing checklist

```text
Create devnet AETHER mint
Create treasury ATA
Mint test AETHER to player wallet
Get quote
Sign transfer with memo
Confirm tx
Verify item grant
Attempt duplicate confirm and confirm rejection
Attempt wrong item/amount and confirm rejection
```
