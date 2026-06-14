# 04 — Step-by-Step Development Plan

## Phase 0 — Setup

```bash
node --version    # use Node 20+
pnpm --version
solana --version  # optional for devnet token work
```

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Phase 1 — Make the browser game feel playable

### Step 1. Boot screen and GameBoy frame

Goal:

```text
Canvas loads instantly.
Pixel scaling is correct.
No external art required.
```

Acceptance:

```text
Player sees title/town screen in browser.
No wallet required.
```

### Step 2. Town movement

Goal:

```text
Move hero around Lumengarde with keyboard.
Clamp movement to screen bounds.
Show NPC, shop, and dungeon gate.
```

Acceptance:

```text
Player can move, read control instructions, and interact with objects.
```

### Step 3. NPC quest

Goal:

```text
Quest NPC explains the first objective.
Quest flag persists in localStorage.
```

Acceptance:

```text
Interact with NPC → questAccepted = true.
```

## Phase 2 — Combat and dungeon

### Step 4. Chronofrost battle

Goal:

```text
Implement simple battle loop.
Add Attack, Freeze, Defend.
Use a turn timer / delay model.
```

Acceptance:

```text
Player can beat a Frost Slime.
Freeze visibly delays enemy tempo.
```

### Step 5. Dungeon sequence

Goal:

```text
Short dungeon with several encounters and one boss.
```

Acceptance:

```text
Player clears dungeon, gets gold/XP, returns to town.
```

## Phase 3 — Shop and progression

### Step 6. Off-chain shop

Goal:

```text
Let guest players buy a cosmetic with Gold.
This proves the shop UX before Web3.
```

Acceptance:

```text
Item appears in inventory after purchase.
```

### Step 7. Optional wallet connection

Goal:

```text
Connect Phantom for prototype.
Read wallet public key.
Read devnet $AETHER balance if mint is configured.
```

Acceptance:

```text
Wallet status appears in HUD without blocking gameplay.
```

## Phase 4 — Correct devnet `$AETHER` purchase flow

### Step 8. Server quote

Goal:

```text
Server creates order with item, price, mint, treasury, expiry, nonce.
```

Acceptance:

```text
POST /shop/quote returns quote and stores order as pending.
```

### Step 9. Player-signed transfer

Goal:

```text
Client builds SPL transferChecked transaction from player ATA to treasury ATA.
Transaction includes Memo(orderId).
Wallet signs and sends.
```

Acceptance:

```text
User sees wallet approval.
Server never touches player private key.
```

### Step 10. Confirm and grant

Goal:

```text
Server verifies Solana transaction and grants item exactly once.
```

Acceptance:

```text
Duplicate tx rejected.
Wrong amount rejected.
Wrong destination rejected.
Expired order rejected.
Correct tx grants item.
```

## Phase 5 — Deploy demo

### Step 11. Deploy client

```bash
pnpm build
# deploy apps/client/dist to Vercel or Netlify
```

### Step 12. Deploy server

```bash
pnpm --filter @chronofrost/server build
# deploy server to Railway/Fly.io/Render
```

### Step 13. Playtest checklist

```text
5 testers open browser link
5 testers reach first battle
3+ testers clear dungeon
0 testers forced to connect wallet
wallet test done separately with devnet funds
```

## 7-day schedule

| Day | Deliverable |
|---|---|
| Day 0 | Local setup, repo running, env configured. |
| Day 1 | Town movement and NPC interaction. |
| Day 2 | Quest state, local save, UI overlay. |
| Day 3 | Battle system with Freeze mechanic. |
| Day 4 | Dungeon loop and boss. |
| Day 5 | Shop UX and off-chain cosmetics. |
| Day 6 | Wallet + devnet `$AETHER` balance + quote-confirm server. |
| Day 7 | Polish, sound placeholders, deploy, 5-person playtest. |

## 30-day plan

```text
Week 1: playable browser demo
Week 2: better dungeon, analytics, database persistence, balance pass
Week 3: devnet shop hardening, SIWS auth, anti-cheat design, landing page
Week 4: community launch assets, Pump.fun launch readiness, public demo event
```
