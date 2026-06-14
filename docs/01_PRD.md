# 01 — Product Requirements Document

## Product name

**Chronofrost: Aetherbound**

## Platform

```text
PC browser first
Vite + Phaser 3 + TypeScript
GameBoy-style pixel presentation
No install required
Optional Solana wallet
```

## Audience

| Segment | Reason they care |
|---|---|
| Retro RPG players | Simple nostalgia, browser accessibility, fast dungeon loops. |
| Crypto-native Solana users | Optional token identity, cosmetic ownership path, community launch. |
| Casual browser gamers | Can try immediately without wallet or download. |
| Web3 communities | Token-gated cosmetics, guild events, leaderboard sponsorships later. |

## Problem

Most Web3 games overbuild token systems before the game is enjoyable. Most retro games have no modern community/ownership layer. Chronofrost solves this by shipping a simple game loop first, then layering optional Web3 identity and cosmetics.

## MVP scope

### Must have

```text
Title screen
Town map
Player movement
NPC dialogue
Quest accept
Dungeon entry
Turn-based battle
Chronofrost Timeline mechanic
One boss
Gold / XP rewards
Inventory
Shop screen
Guest mode
Optional wallet connect
Devnet $AETHER balance read
Devnet item purchase quote-confirm flow
```

### Should have

```text
Sound effects
Chiptune loop
Save/load local state
Basic backend inventory mirror
Basic analytics events
```

### Not in MVP

```text
Mainnet purchases
Token rewards
NFT minting
Marketplace
Multiplayer
PvP
Staking
governance
loot boxes
paid stat power
```

## Core gameplay loop

```text
Explore town
→ accept quest
→ enter dungeon
→ fight enemies using timeline manipulation
→ defeat boss
→ earn gold/items
→ buy cosmetic or utility non-power item
→ repeat with harder dungeon later
```

## Web3 loop

```text
Play as guest
→ connect wallet optionally
→ prove wallet ownership
→ read $AETHER balance
→ request shop quote
→ sign SPL token transfer
→ backend verifies transaction
→ cosmetic item appears in inventory
```

## User stories

### Guest player

```text
As a new player, I can open the game in a browser and immediately move around without creating an account.
```

### Retro RPG player

```text
As a player, I can finish a short dungeon in 5 minutes and feel that timing/time-freezing decisions matter.
```

### Wallet user

```text
As a Solana user, I can connect my wallet after trying the game and optionally buy a cosmetic with devnet $AETHER in the prototype.
```

### Founder/community buyer

```text
As an early supporter, I can buy or hold $AETHER for cosmetic identity/community participation without being promised profit, yield, or passive income.
```

## Product metrics

| Stage | Metric | Target |
|---|---:|---:|
| Prototype | Demo completion rate | > 50% of testers |
| Prototype | Time to first battle | < 2 minutes |
| Prototype | Wallet connect conversion | Measure only, no target yet |
| Beta | D1 retention | > 25–30% |
| Beta | Shop open rate | > 20% |
| Beta | Purchase failure rate | < 2% |
| Launch | Player complaints about pay-to-win | near zero |

## Acceptance criteria

```text
A player can complete the whole loop without wallet.
A player can connect wallet after playing.
A player can see devnet $AETHER balance.
A player can buy one cosmetic through quote-confirm flow.
The backend rejects incorrect mint, incorrect amount, incorrect treasury destination, duplicate tx, expired order, and missing memo/orderId.
```
