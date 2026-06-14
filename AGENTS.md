# Chronofrost Agent Instructions

This repo is built for coding-agent handoffs. Follow this file before editing code.

## Product invariant

Chronofrost is a free-to-try browser GameBoy-style RPG with optional `$AETHER` cosmetic purchases and studio-funded ranked season rewards.

Non-negotiable rules:

- No player staking.
- No player-funded prize pool.
- No PvP betting or wagering.
- No entry fee that feeds rewards.
- PvP prizes, if used, are funded only by the studio treasury.
- `$AETHER` early utility is cosmetics, profile identity, founder items, and optional community access.
- The backend never moves tokens from a player wallet without the player signing a transaction.

## Commands

Use these from repo root:

```bash
pnpm install --frozen-lockfile
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
pnpm agent:context
```

When dependencies are unavailable, still run:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```

## Main architecture

- Browser client: `apps/client`
- Server API: `apps/server`
- Shared dependency-free contracts: `packages/shared`
- PvP server authority: `apps/server/src/pvp`
- Auth/SIWS session: `apps/server/src/auth`
- Solana purchase verification: `apps/server/src/solana`
- Agent task docs: `.codex/tasks`, `.claude/commands`, `prompts`

## Safe edit boundaries

Preferred next edits:

1. Implement Postgres repository adapter behind `apps/server/src/pvp/repositories.ts`.
2. Add durable payout approval tables and routes.
3. Add signed treasury payout executor after approval/preflight.
4. Add client PvP UI using `apps/client/src/services/pvpApi.ts`.
5. Code-split Solana wallet imports so guest play loads fast.

Do not reintroduce:

- `POST /pvp/match` one-shot endpoint.
- Client-supplied `p1`, `p2`, winner, prize pool, or distribution.
- Public payout endpoints.
- Any direct player-to-player token transfer for PvP outcomes.

## PR/patch standard

Every coding pass must update one of:

- tests proving the changed behavior;
- docs explaining an intentionally unimplemented stub;
- `VERIFICATION_REPORT_*.md` with exact commands and results.

Keep changes small enough that another agent can review with a normal diff.
