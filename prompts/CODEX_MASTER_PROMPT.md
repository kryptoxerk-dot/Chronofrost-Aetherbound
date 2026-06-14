# Codex Master Prompt

```text
You are working in the Chronofrost: Aetherbound repo.

Goal: implement a simple browser-first GameBoy-style RPG vertical slice with optional Solana devnet integration.

Important corrections:
- Do not force wallet login.
- Do not use real mainnet funds.
- Do not reward tradable tokens from gameplay.
- Do not write code where the server transfers user tokens without the user signature.
- Implement quote -> signed transfer -> transaction verification -> idempotent grant.

Start by running typecheck/build if available. Then implement one small feature at a time.

Current priorities:
1. keep `apps/client` playable,
2. keep `apps/server` running,
3. make combat fun with Freeze timeline delay,
4. make shop safe,
5. make wallet optional.

When editing, avoid broad rewrites. Use typed interfaces, safe error handling, and clear TODOs for production upgrades.
```
