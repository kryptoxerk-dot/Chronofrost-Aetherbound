# Agent Workflow and Code Ownership

## Objective

Make Claude Code, Codex, or another coding agent productive without needing to rediscover the project rules each session.

This phase adds:

- root `AGENTS.md` instructions;
- architecture guard scripts;
- context bundle generation;
- phase-specific prompts;
- API contract documentation;
- repository adapter scaffolding;
- rate-limit scaffolding;
- payout approval/preflight scaffolding.

## How an agent should start

```bash
pnpm install --frozen-lockfile
pnpm agent:preflight
pnpm architecture:guard
pnpm verify
pnpm agent:context
```

Then read:

```text
AGENTS.md
AGENT_CONTEXT_BUNDLE.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
docs/api/openapi.yaml
```

## Ownership map

| Area | Files | Owner role |
|---|---|---|
| Game client | `apps/client/src/scenes`, `apps/client/src/systems` | Phaser/browser engineer |
| Web3 shop | `apps/client/src/solana`, `apps/server/src/routes/shop.ts`, `apps/server/src/solana` | Solana engineer |
| Auth | `apps/server/src/routes/auth.ts`, `apps/server/src/auth` | Backend/security engineer |
| PvP lifecycle | `apps/server/src/pvp/matchmaking.ts`, `apps/server/src/routes/pvp.ts` | Backend/game systems engineer |
| Anti-sybil | `apps/server/src/pvp/eligibility.ts` | Risk/abuse systems engineer |
| Payout approval | `apps/server/src/pvp/payoutApproval.ts`, `apps/server/src/pvp/treasuryPayoutPreflight.ts` | Backend/ops engineer |
| Persistence | `apps/server/src/pvp/repositories.ts`, `apps/server/src/pvp/adapters` | Backend/database engineer |
| Agent workflow | `AGENTS.md`, `prompts`, `.codex`, `.claude`, `scripts` | Technical lead |

## Required invariants for future agents

1. Player identity must come from SIWS session, not request body.
2. Server owns PvP match seed, side assignment, turn order, state, and winner.
3. Public requests cannot set prize pool, distribution, payout candidates, or winner.
4. Payout planning, approval, and execution are separate phases.
5. In-memory storage is for local/dev only; real seasons require Postgres.
6. Fingerprinting hooks must store salted hashes only, never raw IP/device data.
7. Pump.fun token utility must not be marketed as profit, yield, or betting.

## Verification standard

Preferred green gate:

```bash
pnpm verify:agent
```

Minimum offline gate:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```
