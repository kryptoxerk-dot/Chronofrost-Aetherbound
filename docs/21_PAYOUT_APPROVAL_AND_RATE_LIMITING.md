# Payout Approval and Rate Limiting

## Objective

This phase adds guardrails around the two next-risky areas:

1. abusive calls to PvP/admin endpoints;
2. accidental payout execution from a leaderboard without review.

## Rate limiting

A dependency-free fixed-window limiter now exists at:

```text
apps/server/src/security/rateLimit.ts
```

PvP routes use separate limits for:

```text
pvp.queue
pvp.action
pvp.admin
```

Environment variables:

```text
PVP_QUEUE_RATE_LIMIT_MAX
PVP_QUEUE_RATE_LIMIT_WINDOW_MS
PVP_ACTION_RATE_LIMIT_MAX
PVP_ACTION_RATE_LIMIT_WINDOW_MS
PVP_ADMIN_RATE_LIMIT_MAX
PVP_ADMIN_RATE_LIMIT_WINDOW_MS
```

This is a local/dev safety layer. Production should also add CDN/WAF/edge limits and later a Redis-backed limiter for multi-instance deployments.

## Payout approval workflow

The reward flow is now staged:

```text
season snapshot
→ eligibility-filtered payout plan
→ payout approval request
→ admin approval/rejection
→ treasury preflight
→ separate signed treasury execution later
→ record execution tx signature
```

Current files:

```text
apps/server/src/pvp/payoutApproval.ts
apps/server/src/pvp/treasuryPayoutPreflight.ts
```

Admin endpoints:

```text
POST /admin/pvp/season/:seasonId/payout-approval-request
GET  /admin/pvp/payout-requests
GET  /admin/pvp/payout-requests/:requestId
POST /admin/pvp/payout-requests/:requestId/approve
POST /admin/pvp/payout-requests/:requestId/reject
POST /admin/pvp/payout-requests/:requestId/cancel
GET  /admin/pvp/payout-requests/:requestId/preflight
POST /admin/pvp/payout-requests/:requestId/record-execution
```

Important: `record-execution` only records a tx signature after preflight. It does not sign or send tokens.

## Treasury execution rule

The future executor must satisfy all of these before sending `$AETHER`:

```text
approved payout request
not already executed
studio-funded plan only
eligible-season-snapshot source
no duplicate recipients
total payout <= configured prize pool
operator approval recorded
on-chain tx verified after send
```

## Still not production-ready

Before real prizes:

```text
Postgres adapter
admin audit log
manual review UI
separate signer/treasury wallet policy
on-chain payout verifier
legal/compliance review
```
