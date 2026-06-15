# Verification Report — Combat Balance Pass (Defend rework)

Date: 2026-06-15

## Scope

Lane B "balance adjustments for Attack, Freeze, and Defend". Defend was a near-
trap option: it cost a full turn to save ~2 damage while Attack and Freeze were
both productive. Reworked Defend into a tempo/resource move so the three actions
form a real loop:

- Attack — steady damage, no cost.
- Chronofreeze — burst damage + timeline control, costs MP.
- Defend — halves the next hit AND refuels MP to fuel more Freezes.

## Changes

- `apps/client/src/config/balance.ts` — `defend.mpBonus = 2`.
- `apps/client/src/systems/combat.ts` — Defend now restores `mpBonus` MP (on top
  of per-turn regen) and logs "braces and gathers aether"; added `defendPolicy`.
- `apps/client/src/services/onboarding.ts` — guide line "Defend braces AND
  refuels MP." for discoverability.
- `apps/client/src/systems/combat.test.ts` — two new tests.

## Design intents now codified by tests

Existing (unchanged, still green): Freeze damages + delays; Defend reduces
incoming damage; attack-only LOSES the boss (forces Freeze use); freeze-first
WINS the boss. New:

- Defending gathers aether — restores MP that a plain turn would not, enabling a
  Chronofreeze that was otherwise unaffordable.
- Defending alone cannot win — it deals no damage (enemy HP untouched; the
  all-defend hero loses), so Defend is a support move, not a win condition.

## Verification

```text
pnpm -r typecheck                    -> Done
pnpm -r test                          -> 115 tests passed (server 72 + client 43; +2)
node scripts/agent-preflight.mjs      -> passed
node scripts/architecture-guard.mjs   -> passed
pnpm -r build                         -> built
```

## Notes

- No engine structure changed — all tuning stays in `COMBAT_CONFIG`.
- The MP economy stays bounded: Defend gives net +3 MP (regen + bonus) but no
  damage, so refuel-then-Freeze trades tempo for control rather than dominating.
