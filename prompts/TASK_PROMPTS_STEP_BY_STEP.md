# Step-by-Step Task Prompts

## 1. Verify local setup

```text
Inspect the repo and make sure pnpm scripts are correct. Run typecheck/build where possible. Fix only blocking errors. Do not add new features yet.
```

## 2. Improve town movement

```text
Improve TownScene movement and interaction. Keep it GameBoy-style, browser-first, and wallet-free. Add clear interaction hints near NPC/shop/dungeon.
```

## 3. Improve Chronofrost combat

```text
Improve the combat system so Freeze visibly delays enemy turns and Defend reduces next incoming damage. Keep combat deterministic enough to test later.
```

## 4. Add dungeon rooms

```text
Expand DungeonScene into a short 10-room path with 2 enemies, 1 shrine, 1 choice, and 1 boss. Keep placeholder graphics.
```

## 5. Add local inventory UI

```text
Add inventory display and local save/load for Gold purchases. Do not require wallet.
```

## 6. Add wallet balance safely

```text
Add optional Phantom wallet connect. If Phantom is missing, show a helpful message and keep the game playable. If AETHER_MINT is unset, show “devnet token not configured”.
```

## 7. Implement quote-confirm purchase

```text
Implement devnet $AETHER purchase flow using server quote, wallet-signed transferChecked transaction with Memo(orderId), and server confirm verification. The server must never sign for the player.
```

## 8. Add tests

```text
Add tests for combat freeze delay, duplicate transaction rejection, expired order rejection, and wrong amount/mint/treasury rejection using mocked parsed transactions.
```

## 9. Prepare Pump.fun launch assets

```text
Create launch copy, token description, risk statement, and pinned mint verification post. No ROI/yield/profit promises. Utility is cosmetics/community only.
```
