# Claude Code Master Prompt

Use this at the repo root.

```text
PROJECT: Chronofrost: Aetherbound

Build a simple GameBoy-style pixel RPG for PC browsers using Phaser 3 + Vite + TypeScript. The game must be playable without a wallet. Web3 is optional and devnet-first.

CORE OBJECTIVE:
Create a 5-minute playable demo:
1. player starts in town,
2. talks to an NPC,
3. accepts a quest,
4. enters dungeon,
5. fights enemies using a Chronofrost time-delay mechanic,
6. defeats a boss,
7. earns off-chain Gold,
8. optionally connects Solana wallet,
9. optionally tests a devnet $AETHER cosmetic purchase.

TECH STACK:
- Client: Phaser 3 + Vite + TypeScript
- Server: Node + Fastify + TypeScript
- Solana: @solana/web3.js + @solana/spl-token
- Network: DEVNET ONLY for implementation

NON-NEGOTIABLE RULES:
1. Guest-first. The game must run without wallet connection.
2. No mainnet code paths for real funds in the prototype.
3. No token rewards from gameplay.
4. $AETHER is cosmetic-only in the prototype.
5. No XP boosters, paid power, paid dungeon reward multipliers, or loot boxes.
6. The backend must never transfer tokens out of a player wallet. The player must sign the SPL token transfer.
7. Purchases use quote-confirm flow:
   - server creates order quote
   - client builds transferChecked tx with Memo(orderId)
   - wallet signs/sends tx
   - server verifies confirmed tx
   - server grants item once
8. Keep all tunable numbers in config files.
9. Use generated placeholder assets if needed. Do not block on art.
10. Keep each step runnable.

IMPLEMENTATION ORDER:
1. Ensure pnpm dev runs client and server.
2. Build/verify Town movement and NPC interaction.
3. Build combat pure TS and BattleScene.
4. Build short DungeonScene.
5. Build ShopScene with off-chain Gold purchase.
6. Add optional wallet connect and balance read.
7. Add server quote/confirm flow.
8. Add tests for combat and order verification.

OUTPUT STYLE:
For each task, provide:
- changed files
- concise explanation
- run commands
- test/verification steps
- any risks or TODOs

Do not implement multiplayer, NFTs, marketplace, staking, governance, or token rewards unless explicitly requested later.
```
