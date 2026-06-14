# Claude Code Phase 5 Prompt

We are preparing Chronofrost for easier automated coding passes.

Your job is not to invent a new architecture. Your job is to implement the next backlog item while preserving invariants.

Start:

```bash
pnpm install --frozen-lockfile
pnpm agent:context
```

Read:

```text
AGENTS.md
AGENT_CONTEXT_BUNDLE.md
docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md
docs/21_PAYOUT_APPROVAL_AND_RATE_LIMITING.md
```

## Current state

The repo already has:

- server-authoritative PvP lifecycle;
- anti-sybil eligibility engine;
- admin-only payout planning;
- payout approval/preflight scaffold;
- local fixed-window rate limiter;
- Postgres repository interfaces and adapter scaffold;
- OpenAPI contract.

## Next best work

Prioritize this order:

1. Postgres persistence adapter.
2. Durable payout approval records.
3. SIWS auth route rate limits.
4. Client PvP UI.
5. Solana wallet code-splitting.

## Stop conditions

Stop and report if a requested change would introduce:

- player-funded prize pot;
- PvP staking;
- entry fees feeding prizes;
- client-supplied match winners;
- public prize pool configuration;
- automatic treasury transfers without approval.

## Verification

Run:

```bash
pnpm verify:agent
```

If package installation is unavailable, run:

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```
