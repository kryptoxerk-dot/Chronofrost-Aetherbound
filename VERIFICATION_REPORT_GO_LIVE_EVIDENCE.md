# Verification Report - Go-Live Evidence Gate

Date: 2026-06-15

## Scope

- Added `scripts/go-live-evidence-check.mjs` to validate operator-collected
  launch evidence before declaring the real mainnet prototype live.
- Added `resources/go_live_evidence.example.json` as the fill-in evidence
  template.
- Added `docs/24_GO_LIVE_EVIDENCE.md` to document the required evidence gates
  and sign-off rule.

## Verification

```bash
node scripts/go-live-evidence-check.mjs resources/go_live_evidence.example.json --allow-placeholders
node scripts/agent-preflight.mjs
node scripts/architecture-guard.mjs
node scripts/agent-context-pack.mjs
```

Results:

- `go-live evidence check passed for resources\go_live_evidence.example.json`
- Placeholder warning emitted as expected in template mode.
- Negative check against the example without `--allow-placeholders` failed as
  expected and reported missing production evidence fields.
- `agent-preflight passed`
- `architecture-guard passed`

## Notes

- The validator is intentionally static. It does not contact production,
  wallets, Solana RPC, or Postgres.
- Placeholder mode is only for checking the committed template shape. Real
  launch sign-off must run without `--allow-placeholders`.
