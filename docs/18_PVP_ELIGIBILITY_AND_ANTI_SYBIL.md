# 18 — PvP Eligibility and Anti-Sybil Layer

## Objective

Protect studio-funded `$AETHER` ranked season rewards from cheap wallet farming,
collusion, fake matches, forfeits, and low-quality leaderboard manipulation.

This layer keeps the core product model intact:

```text
free ranked PvP
studio-funded season rewards
no player staking
no player-funded prize pool
no PvP betting
```

## What changed in this phase

Added server-side eligibility logic:

```text
apps/server/src/pvp/eligibility.ts
apps/server/src/pvp/eligibility.test.ts
apps/server/src/pvp/repositories.ts
```

Updated payout planning so admin payout plans use an eligible season snapshot,
not the raw leaderboard.

## Eligibility statuses

```text
eligible        = can enter automatic payout candidate list
ineligible      = lacks minimum activity/diversity requirements
flagged_review  = activity qualifies, but suspicious signals require admin review
banned          = excluded by admin/abuse policy
admin_excluded  = test wallet, admin wallet, or manually excluded wallet
```

Only `eligible` players enter automatic payout plans.

## MVP eligibility rules

Recommended public-season defaults:

```text
Minimum account age: 7 days
Minimum completed ranked matches: 30
Minimum unique opponents: 10
Repeated-opponent cap: first 3 matches count fully
Forfeit/timeout rate cap: 20%
Short-match rate cap: 35%
Identity cluster threshold: 3 wallets per strong signal
```

These are configurable through server env.

## Anti-sybil signals

The system evaluates:

```text
completed ranked matches
unique opponents
repeated opponent concentration
forfeit / timeout rate
ultra-short match rate
win/loss diversity
active admin flags
banned/admin/test wallet status
salted IP/device/user-agent hash clusters when enabled
```

A suspicious signal does not automatically confiscate rewards. It moves the
player to `flagged_review`, which means a human should inspect the account
before payout approval.

## Privacy rule

If identity-signal collection is enabled, only salted hashes are stored:

```text
ipHash
deviceHash
userAgentHash
```

Do not store raw IP addresses, raw device fingerprints, or raw user-agent data
in normal match records. The config switch defaults to disabled.

## Admin routes

```text
GET  /admin/pvp/season/:seasonId/eligibility-report
POST /admin/pvp/season/:seasonId/snapshot
POST /admin/pvp/season/:seasonId/payout-plan
POST /admin/pvp/players/:playerId/flag
POST /admin/pvp/players/:playerId/ban
POST /admin/pvp/players/:playerId/clear-flag
```

All admin routes require:

```text
x-admin-token: <PVP_ADMIN_TOKEN>
```

Optional audit actor header:

```text
x-admin-actor: <operator-name>
```

## Player route

```text
GET /pvp/me/eligibility
```

Requires SIWS session bearer token. Returns the player’s current eligibility
status and reasons without exposing private fingerprint hashes.

## Payout flow after this phase

```text
1. Season ends.
2. Admin creates snapshot.
3. Eligibility engine classifies every ranked player.
4. Flagged/ineligible/banned/admin-excluded wallets are excluded from automatic payout candidates.
5. Admin payout plan uses eligible snapshot players only.
6. Separate future treasury executor signs and sends payouts after manual approval.
```

## Still not built

This phase does not send tokens. It does not replace in-memory stores with
Postgres. It does not add live WebSocket matchmaking.

Production blockers before real `$AETHER` prize payouts:

```text
Postgres adapter for repository interfaces
rate limiting
manual payout approval workflow
signed treasury payout executor
monitoring/alerts
legal/compliance review for target markets
```
