# PvP Security Patch Notes

This patch closes the core PvP problems found in the previous package.

## Fixed

1. Removed the unsafe public `POST /pvp/match` one-shot endpoint.
2. Added SIWS-session-bound PvP identity. The authenticated wallet is the player ID.
3. Added turn-by-turn match lifecycle:
   - `POST /pvp/queue`
   - `GET /pvp/me/active-match`
   - `GET /pvp/matches/:matchId/state`
   - `POST /pvp/matches/:matchId/action`
   - `POST /pvp/matches/:matchId/forfeit`
   - `POST /pvp/matches/:matchId/claim-timeout`
4. Server owns match seed, p1/p2 side assignment, turn order, action log, HP, and result.
5. Only participants can read/act in a match.
6. Only the current-turn player can submit an action.
7. Completed matches update Elo through the server ladder only.
8. Defend now reduces incoming damage and ripostes predictable attack spam.
9. Freeze was tuned down so it is tactical instead of a universal spam action.
10. Season payout planning moved to admin-only endpoint:
    `POST /admin/pvp/season/payout-plan`.
11. Public callers can no longer submit `prizePoolRaw` or payout distribution.
12. Added a Postgres target schema for persistent PvP records.

## Still required before real $AETHER prizes

- Replace in-memory PvP repositories with Postgres.
- Add rate limits and abuse monitoring.
- Add anti-sybil policy for ranked season eligibility.
- Add admin review workflow for payout plan approval.
- Add signed treasury payout executor as a separate tool, not an automatic API.
- Run legal/compliance review for target jurisdictions.

## Invariant

Ranked PvP remains studio-funded only:

- No player staking.
- No player-funded pot.
- No PvP entry fee that feeds rewards.
- No automatic treasury drain from leaderboard state.

## Next phase patch — anti-sybil eligibility

Added after the PvP core security patch:

1. Prize eligibility engine.
2. Player statuses: eligible, ineligible, flagged_review, banned, admin_excluded.
3. Minimum match/opponent/activity rules.
4. Repeated-opponent, forfeit, short-match, win/loss diversity, and identity-cluster signals.
5. Privacy-safe salted hash hooks for IP/device/user-agent signals.
6. Admin flag/ban/clear-flag routes.
7. Season eligibility reports and saved snapshots.
8. Payout plans now consume eligible snapshot players instead of raw leaderboard rows.
9. Postgres schema expanded for player flags, identity hashes, eligibility rows, snapshots, payout approvals, and match quality metrics.
