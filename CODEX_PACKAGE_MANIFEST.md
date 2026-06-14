# Codex Package Manifest

This zip contains everything Codex needs for the next implementation phase:

## Included

- Full monorepo source under `apps/` and `packages/`
- Server API, PvP, anti-sybil, payout approval scaffold, Solana verification code
- Browser client starter and PvP API helper
- `AGENTS.md` agent instructions
- `CODEX_START_HERE.md` Codex entrypoint
- `.codex/` task files and Codex prompt
- `.claude/` handoff files for Claude Code
- `AGENT_CONTEXT_BUNDLE.md`
- Product/design/architecture/security docs under `docs/`
- OpenAPI contract under `docs/api/openapi.yaml`
- Database schemas under `resources/`
- CI workflow and local verification scripts
- `pnpm-lock.yaml` for deterministic installs

## Excluded

- `node_modules/`
- build outputs such as `dist/`
- local caches, coverage output, and OS metadata
- private keys, seed phrases, RPC secrets, admin tokens, real wallet secrets

## Best next Codex task

```text
.codex/tasks/001-postgres-pvp-repositories.md
```

## Verify after unzip

```bash
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```
