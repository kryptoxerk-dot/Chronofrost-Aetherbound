# Verification Report — Enemy Variety (behavior AI)

Date: 2026-06-15

## Scope

Enemies previously all did the same thing: a plain physical attack. Added
data-driven, probability-based behaviors through the pure seeded combat model so
foes feel distinct, without breaking deterministic sims.

## Behaviors

- Frost Slime — pure attacker (tutorial foe).
- Clock Wraith — `haste`: sometimes blurs forward (shaves its next wait) so it
  acts again sooner; fits its speed theme.
- Crystal Golem — `guard`: often braces, halving the hero's next physical hit —
  steering the player toward Chronofreeze, which ignores armor.
- Chrono Warden — `surge`: a heavy Temporal Surge (damage x1.6) plus the
  occasional guard, giving the boss varied pressure.

## Changes

- `apps/client/src/config/balance.ts` — `EnemyBehavior` type + per-enemy
  `behavior` data (guard/special chances, surge multiplier, haste amount).
- `apps/client/src/systems/combat.ts` — `Combatant.behavior`; `dealPhysical`
  gains an `attackMultiplier`; `chooseEnemyAction` (single rng draw, cumulative
  thresholds) and a behavior-driven `enemyAct` (attack / guard / surge / haste).
- `apps/client/src/systems/combat.test.ts` — 4 new tests.

## Stability guarantee

`chooseEnemyAction` rolls the shared rng once; the default deterministic rng
returns 1, so every threshold fails and the enemy always attacks. Headless sims
(`simulateBattle`, default rng) are therefore unchanged — the existing boss
invariants still hold:

- attack-only LOSES the boss; freeze-first WINS the boss (unchanged).
- New: under default rng an enemy just attacks (no guard/surge); the Wraith can
  haste (acts sooner + still strikes); the Golem can guard (no damage, braces);
  the Warden surge hits harder than a normal blow.

Variety only appears under real randomness (`BattleScene` uses `Math.random`).

## Verification

```text
pnpm -r typecheck                    -> Done
pnpm -r test                          -> 123 tests passed (server 72 + client 51; +4)
node scripts/agent-preflight.mjs      -> passed
node scripts/architecture-guard.mjs   -> passed
pnpm -r build                         -> built
```
