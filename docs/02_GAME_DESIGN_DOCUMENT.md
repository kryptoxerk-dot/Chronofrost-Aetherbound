# 02 — Game Design Document

## Genre

Retro browser RPG with short dungeon runs and turn-based tactical combat.

## Visual style

```text
GameBoy-inspired
low resolution base: 320x288
integer scaling
pixelArt enabled
limited palette
chunky UI frames
minimal animation
placeholder geometric sprites acceptable for prototype
```

## Controls

```text
Move: WASD / arrow keys
Interact: E / Space
Menu: Tab
Cancel: Escape
Battle attack: A
Battle freeze: F
Battle defend: D
```

## Setting

Chronofrost is a frozen world where time crystallized after the Aetherbound event. Towns survive inside warm “Aether Lamps.” Dungeons are time fractures where creatures repeat corrupted moments.

## First town: Lumengarde

Small safe hub with:

```text
Quest NPC
Shopkeeper
Dungeon gate
Aether shrine
Founder cosmetic preview NPC later
```

## First dungeon: Frostglass Cavern

A short 3–10 room dungeon for prototype. The current launch slice is a compact
five-node run so the first public build is finishable with placeholder art:

```text
Frost Slime
Clock Wraith
Aether Shrine
Crystal Golem
Chrono Warden boss
```

The later target version should use 10 rooms.

```text
Entrance
Enemy room
Choice room
Heal shrine
Elite room
Puzzle room
Merchant/rest room
Boss gate
Chrono Warden boss
Exit portal
```

## Signature mechanic: Chronofrost Timeline

The battle system should not be generic. Each unit acts on a timeline. Skills manipulate future turns.

| Mechanic | Prototype effect | Later expansion |
|---|---|---|
| Freeze | Delay enemy next turn | Delay, stack frost, shatter combo |
| Thaw | Speed up ally turn | Buff tempo, cleanse freeze |
| Fracture | Interrupt charged attack | Boss mechanic counterplay |
| Rewind | Undo part of previous damage | Limited Aether meter skill |
| Aether Surge | Act immediately | Ultimate tempo resource |

## Prototype hero

Cut the initial scope to one hero.

```text
Name: Aether Knight
Role: balanced melee/control
HP: 32
Attack: 7
Defense: 3
Speed: 8
Skills:
- Slash: basic attack
- Frost Guard: defend + reduce incoming damage
- Chronofreeze: delay enemy turn
```

## Enemies

| Enemy | Role | Mechanic |
|---|---|---|
| Frost Slime | basic | low damage tutorial enemy |
| Clock Wraith | fast | acts quickly, low HP |
| Crystal Golem | tank | slow, high defense |
| Chrono Warden | boss | charges a big attack that should be frozen/fractured |

## Reward model

Use non-tradable/off-chain rewards at first.

```text
XP
Gold
Cosmetic unlock flags
Quest flags
```

Do not reward tradable `$AETHER` from dungeon clears until the backend can validate combat deterministically and anti-bot systems exist.

## Shop design

Early safe items:

```text
Palette swaps
Nameplate frames
Pet cosmetic
Town banner
Founder badge
Music room unlock
```

Avoid early:

```text
XP boosters
stat boosts
paid dungeon keys
paid token-earning multipliers
paid random loot boxes
```

## UX rule

Every player should understand the game without knowing Web3.

```text
Do not show token jargon on first screen.
Do not require wallet for movement, quest, dungeon, battle, or gold shop.
Introduce wallet only after fun is proven.
```
