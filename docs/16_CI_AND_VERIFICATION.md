# CI and Verification Gates

## Objective

Prevent a broken starter package from shipping again. Every pull request should prove that the browser client, backend, combat engine, auth replay guard, purchase verifier, and build output still work.

## Required local command

Run this before zipping or deploying:

```bash
pnpm verify
```

This expands to:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## GitHub Actions workflow

The package includes:

```text
.github/workflows/ci.yml
```

It runs on pushes and pull requests to `main`:

```text
install dependencies
→ typecheck all workspaces
→ run all tests
→ build all workspaces
```

## Current automated test coverage

Client:

```text
apps/client/src/systems/combat.test.ts
apps/client/src/systems/gameState.test.ts
apps/client/src/scenes/sceneKeys.test.ts
```

Server:

```text
apps/server/src/services/inMemoryStore.test.ts
apps/server/src/solana/verifyPurchaseTransaction.test.ts
```

## Security gates covered

```text
Nonce replay guard: one nonce can only be claimed once.
Order confirmation guard: one pending order can only be claimed by one confirmer at a time.
Inventory idempotency: duplicate order IDs or transaction signatures do not double-grant items.
Purchase verifier: rejects missing memo, wrong amount, wrong treasury, failed tx, and unknown tx.
```

## Gameplay gates covered

```text
Chronofreeze damages and delays the enemy timeline.
Defend reduces incoming damage.
Attack-only boss strategy loses, preserving mechanic importance.
Freeze-based boss strategy wins, proving the signature mechanic matters.
Game state works without wallet or localStorage.
Scene keys are centralized and duplicate-free.
```

## Lockfile note

This starter zip does not include a generated `pnpm-lock.yaml` because dependency installation must run on a machine with npm registry access. After the first successful local install, commit the generated lockfile and change CI dependency installation from:

```bash
pnpm install --no-frozen-lockfile
```

to:

```bash
pnpm install --frozen-lockfile
```
