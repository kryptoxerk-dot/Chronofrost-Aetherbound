# Verification Report — Second-Pass Hardening

## Scope

This pass started from `chronofrost-aetherbound-verified.zip` and added the missing client-side verification and CI enforcement layer.

## Changes made

### Client scene wiring

- Added `apps/client/src/scenes/sceneKeys.ts` as the single source of truth for scene IDs.
- Replaced hardcoded scene keys in Boot, Town, Dungeon, Battle, Shop, and UI overlay scenes.
- Added `apps/client/src/scenes/sceneKeys.test.ts` to catch duplicate or missing scene registry entries.

### Battle pacing fix

The battle scene now pauses timeline advancement while the hero is ready. This keeps the demo closer to a simple GameBoy-style turn-based RPG and prevents enemies from auto-acting while a first-time player is reading the command text.

Hero wins exact timeline ties. If both hero and enemy become ready after a tick, the scene waits for player input.

### Client tests added

- `apps/client/src/systems/combat.test.ts`
  - Chronofreeze damages and delays enemies.
  - Defend reduces incoming damage.
  - Attack-only boss strategy loses.
  - Freeze-based boss strategy wins.

- `apps/client/src/systems/gameState.test.ts`
  - Rewards and level progression work without a wallet.
  - Duplicate inventory grants are ignored client-side.
  - Invalid gold spends are rejected.

### Game state hardening

- `gameState.ts` now works safely in browser, privacy-mode, and Node test environments.
- LocalStorage failures no longer crash the game.
- `getGameState()` returns a copy instead of exposing the mutable internal state object.
- `spendGold()` rejects `NaN`, infinite, negative, or unaffordable spends.

### Server hardening added

- `/shop/confirm` now atomically claims an order before asynchronous Solana transaction verification.
- A concurrent confirmation request receives a conflict instead of entering the same verification path.
- Failed or errored verification releases the order back to pending so the user can retry with a valid transaction before expiry.
- The auth route now validates Solana public keys and signature shape/length before verification.

### Server tests added

- `apps/server/src/services/inMemoryStore.test.ts`
  - nonce claim is single-use
  - order confirmation claim is single-use
  - inventory grant idempotency holds

- `apps/server/src/solana/verifyPurchaseTransaction.test.ts`
  - accepts correct memo + SPL transfer
  - rejects missing memo
  - rejects wrong amount
  - rejects wrong treasury
  - rejects failed transaction
  - rejects unknown transaction

### CI added

- Added `.github/workflows/ci.yml`.
- Added root scripts:

```bash
pnpm verify
pnpm ci
```

CI runs:

```text
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

## Execution note

This environment could not download packages from the npm registry, so dependency installation and full `pnpm verify` could not be executed here. I did run static checks available in the container and fixed issues found without dependencies, including:

- missing Vite environment type reference via `src/vite-env.d.ts`
- an ES2022-only `Array.prototype.at()` usage in tests while the client target is ES2020
- hardcoded client scene strings
- server relative imports without `.js` extensions check
- JSON validity for package manifests

Run this on a networked local machine or CI runner:

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --no-frozen-lockfile
pnpm verify
```

After the first install, commit `pnpm-lock.yaml` and switch CI to `pnpm install --frozen-lockfile`.
