# Verification Report — Next Phase PvP Eligibility / Anti-Sybil

## Package

`chronofrost-aetherbound-next-phase.zip`

## Scope

This phase adds prize eligibility and anti-sybil protection before real
studio-funded `$AETHER` ranked season payouts.

Implemented:

- PvP eligibility engine.
- Player eligibility statuses: `eligible`, `ineligible`, `flagged_review`, `banned`, `admin_excluded`.
- Repeated-opponent, forfeit, short-match, win/loss diversity, active-flag, and identity-cluster checks.
- Privacy-safe salted hash hooks for IP/device/user-agent signals.
- Admin flag/ban/clear-flag routes.
- Season eligibility report and snapshot routes.
- Snapshot-backed payout planning that excludes flagged/ineligible/banned/admin-excluded players.
- Repository interfaces for future Postgres adapter.
- Expanded Postgres target schema.
- Client-side typed PvP API helper.

## Full package verification caveat

The sandbox could not download pnpm from npm registry, so full `pnpm install` /
`pnpm verify` could not be executed here.

Attempted:

```bash
corepack prepare pnpm@9.12.3 --activate
```

Result: registry fetch failed.

## Static checks performed

### Server TypeScript static check with dependency shims

Because node_modules were unavailable, temporary type shims were used only to
replace external library types. These shims were deleted after the check.

Command shape:

```bash
tsc -p apps/server/tsconfig.json --noEmit --pretty false
```

Result: passed with temporary external dependency shims.

### Client TypeScript static check with dependency shims

Command shape:

```bash
tsc -p apps/client/tsconfig.json --noEmit --pretty false
```

Result: passed with temporary external dependency shims.

## Functional smoke test performed

Compiled the pure PvP core files to temporary JavaScript and ran a Node smoke
test without external dependencies:

```bash
tsc -p /tmp/cf_tsc/tsconfig.json
node /tmp/cf_tsc/check.mjs
```

Result:

```text
eligibility smoke passed { rows: 13, payouts: 2 }
```

The smoke test verified:

- Low-activity wallets are ineligible.
- Legitimate wallets with enough matches and opponents are eligible.
- Repeated same-opponent farming is flagged.
- Identity clusters are flagged when salted-hash fingerprinting is enabled.
- Raw IP value is not stored as the identity signal.
- Flagged accounts are excluded from snapshot-backed payout plans.

## Zip integrity

Run after packaging:

```bash
unzip -t chronofrost-aetherbound-next-phase.zip
```

Expected result: `No errors detected`.

## Required verification on a networked machine

After unzipping:

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --frozen-lockfile
pnpm verify
```

Expected:

```text
typecheck passes
tests pass
client/server build pass
```

## Still required before real `$AETHER` rewards

- Replace in-memory stores with Postgres adapters.
- Add API rate limiting.
- Add manual payout approval workflow.
- Add signed treasury payout executor.
- Add monitoring/alerts for match and treasury anomalies.
- Run legal/compliance review for every target market.
