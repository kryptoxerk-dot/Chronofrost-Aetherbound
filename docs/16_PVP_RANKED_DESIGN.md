# 16 — Ranked PvP: skill-based, session-bound, studio-funded prizes

## What this is

Chronofrost PvP is a 1v1 ranked duel mode using the Chronofrost combat actions:

- `attack`
- `freeze`
- `defend`

Players climb an Elo ladder. At season end, top finishers may receive `$AETHER`
from a **studio-funded** prize pool.

## What this is NOT

- Not player-vs-player wagering.
- Not token staking.
- Not a player-funded pot.
- Not an entry-fee prize pool.
- Not a gambling/betting feature.

Players never stake tokens against each other. The pool is funded only by the
studio treasury.

## Security model

PvP identity is bound to Sign-In With Solana session state:

- The authenticated wallet is the player ID.
- The client cannot choose `p1.id` or `p2.id`.
- The client cannot submit both players' action queues.
- The server owns match seed, side assignment, turn order, HP, action log, and
  result.

## Current lifecycle endpoints

- `POST /pvp/queue`
- `GET /pvp/me/active-match`
- `GET /pvp/matches/:matchId/state`
- `POST /pvp/matches/:matchId/action`
- `POST /pvp/matches/:matchId/forfeit`
- `POST /pvp/matches/:matchId/claim-timeout`
- `GET /pvp/matches/:matchId/verify`
- `GET /pvp/leaderboard`
- `GET /pvp/player/:id`

The old unsafe `POST /pvp/match` endpoint has been removed.

## Turn rules

- Only match participants can read/act in the match.
- Only the current-turn player can submit an action.
- Repeated requests from the wrong player are rejected.
- Actions after completion are rejected.
- A stale current player can lose by timeout claim.

## Combat balance patch

The previous PvP engine had two major balance flaws:

1. `defend` did not actually reduce damage.
2. `freeze` was too dominant as a spam action.

The patched engine now makes `defend` a real defensive choice: it reduces the
next incoming hit and ripostes predictable attack spam. `freeze` keeps the
Chronofrost identity but has lower damage, longer self-recovery, and reduced
impact against guard.

## Studio-funded season payouts

The payout-plan endpoint is admin-only:

`POST /admin/pvp/season/payout-plan`

The request body no longer accepts `prizePoolRaw` or `distribution`. Those values
come from server-side env/DB config:

- `PVP_SEASON_ID`
- `PVP_PRIZE_POOL_RAW`
- `PVP_PRIZE_DISTRIBUTION`
- `PVP_TOKEN_DECIMALS`
- `PVP_ADMIN_TOKEN`

The endpoint only creates a payout plan. It does not move funds.

## Required before public prizes

Before paying real `$AETHER` rewards:

1. Replace in-memory ladder/match storage with Postgres.
2. Add rate limits and abuse detection.
3. Add anti-sybil rules for season eligibility.
4. Freeze season snapshots before payout planning.
5. Require admin approval for payout plans.
6. Execute treasury transfers through a separate signed operation.
7. Review target-market legal/compliance requirements.

## Invariant

Keep this invariant permanently:

```text
No player staking.
No player-funded prize pot.
No token betting.
No entry fee that feeds rewards.
Studio-funded season rewards only.
```

## Phase 2 update — eligibility before payout

The ranked ladder now has an eligibility gate for studio-funded rewards. The
leaderboard alone is not enough to receive rewards. At season end, the server
creates an eligibility snapshot and payout plans use only players with status
`eligible`.

Excluded from automatic payout plans:

```text
ineligible accounts
flagged_review accounts
banned accounts
admin_excluded accounts
test wallets
```

This prevents obvious wallet farming and collusion from going straight from
leaderboard rank to treasury payout.
