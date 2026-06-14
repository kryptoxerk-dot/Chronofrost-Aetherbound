# Verification Report — Task 003: Client PvP UI

Date: 2026-06-15

## Scope

Make ranked PvP playable in-browser without real-time infrastructure: an Aether
Arena scene reachable from town with queue, active-match play, turn timer,
eligibility, and leaderboard. Wallet stays optional until a ranked action needs
auth (SIWS at that point). No prize-claim / staking / betting UI.

## Files changed

- `apps/client/src/services/pvpApi.ts` — new; typed REST client matching the
  server serializers (queue, active-match, eligibility, match state, action,
  forfeit, leaderboard, SIWS nonce/verify). Bearer token on ranked calls; public
  leaderboard.
- `apps/client/src/services/pvpSession.ts` — new; browser SIWS orchestration
  (Phantom connect → nonce → signMessage → verify) holding the in-memory session
  token. Only invoked when the player chooses a ranked action.
- `apps/client/src/services/pvpView.ts` — new; pure formatting helpers
  (HP bar, fighter line, turn-timer seconds, outcome text, leaderboard lines).
- `apps/client/src/scenes/PvpScene.ts` — new; text-driven arena scene with
  menu / queue / match / result / leaderboard / eligibility views, server-poll
  loop, turn timer, and turn-gated action submission ([A]/[F]/[D], [X] forfeit).
- `apps/client/src/scenes/sceneKeys.ts` — added `Pvp` key.
- `apps/client/src/scenes/TownScene.ts` — added an ARENA structure that enters
  the PvP scene.
- `apps/client/src/main.ts` — registered `PvpScene`.
- `apps/client/src/types/phantom.d.ts` — added `signMessage` to the provider type.
- Tests: `pvpApi.test.ts` (6, fetch-mocked) + `pvpView.test.ts` (5, pure).

## Behavior vs Task 003 requirements

- PvP menu from town ✓ (ARENA)
- Uses `apps/client/src/services/pvpApi.ts` ✓
- Show queue state ✓ (queue view + poll for match)
- Show active match state ✓ (fighters/HP, log, turn timer)
- Submit only current player action ✓ (gated on `yourTurn`; server is authoritative)
- Show eligibility status ✓
- Show leaderboard ✓
- No token prize-claim UI / no staking/betting UI ✓
- Wallet optional until ranked actions require auth ✓ (scene + leaderboard work
  as guest; [C] connect prompts SIWS only when queueing/checking eligibility)

## Commands run

```text
node scripts/agent-preflight.mjs     -> agent-preflight passed
node scripts/architecture-guard.mjs  -> architecture-guard passed
pnpm --filter @chronofrost/client typecheck -> Done
pnpm -r test                          -> 76 tests passed (server 56 + client 20; 11 new)
pnpm -r build                         -> client 252 modules transformed, built
```

## Notes / follow-ups

- The diverged working-tree client had no `pvpApi.ts`; this rebuilds it against
  the current server contract (the zip reference was slightly stale — real
  `PublicMatchState` includes `p1/p2/viewerId`).
- Phaser scenes aren't unit-tested (no canvas in vitest); scene-independent logic
  was extracted into `pvpView.ts` and the fetch client and covered there.
- Real-time transport (Colyseus/WebSocket) remains a later phase; this uses REST
  polling as planned.
