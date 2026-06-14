# 00 — Master Build Brief

## Objective

Build **Chronofrost: Aetherbound**, a simple GameBoy-style pixel RPG that runs in a PC browser and is easy for anyone to try. The first public version should be a **5-minute playable demo**, not a complex Web3 product.

The Web3 layer should support:

```text
optional Solana wallet connect
optional devnet $AETHER balance display
devnet cosmetic purchase flow
Pump.fun launch plan for the real $AETHER token
```

## Core product promise

> A retro browser RPG where players manipulate frozen time, clear short dungeons, and optionally use `$AETHER` for cosmetic identity and community access.

## Target first demo experience

```text
Minute 0–1: Player opens browser, sees title screen, enters town.
Minute 1–2: Player talks to NPC and accepts first quest.
Minute 2–4: Player enters dungeon and fights enemies.
Minute 4–5: Player beats the Chrono Warden boss, earns gold, returns to town.
Optional: player connects Solana wallet and tests devnet cosmetic shop.
```

## Major product decisions

### 1. Browser-first, not wallet-first

Players must be able to start without wallet setup. Wallet connect appears after the player has experienced the game.

### 2. Game first, token second

The Pump.fun token can help community formation, but the game must not depend on token speculation. The game should still be fun if the player never buys the token.

### 3. `$AETHER` is not the normal reward currency

Use off-chain `Gold` or `Frost Shards` for normal progression. Use `$AETHER` first for cosmetic shop purchases only.

### 4. No pay-to-win

Do not sell XP boosters, paid dungeon keys, paid loot boxes, stat boosts, or token-earning advantages in the first release.

### 5. Correct purchase security

The backend verifies transactions. It does not take tokens from players. The player signs the transfer from their own wallet.

## First sellable version

The first monetizable version is not “token farming.” It is:

```text
Free browser demo
+ Founder cosmetic pack
+ Discord/community access
+ optional $AETHER cosmetic shop
```

## Success criteria for milestone 1

```text
Playable in browser with no install
Runs at stable FPS on average laptops
Guest mode works
One dungeon clear works
One boss works
One shop item works in off-chain mode
Devnet wallet balance can be displayed
Devnet purchase quote-confirm flow works
No private keys in client
```
