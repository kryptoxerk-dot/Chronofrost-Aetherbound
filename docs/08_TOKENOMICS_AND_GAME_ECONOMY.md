# 08 — Tokenomics and Game Economy

## Two-currency model

| Currency | Type | Purpose |
|---|---|---|
| Gold / Frost Shards | Off-chain game currency | Normal rewards, shop basics, crafting, repairs, progression. |
| `$AETHER` | Tradable Solana token | Optional cosmetics, badges, community identity, future cosmetic claims. |

## Why separate them?

If players earn tradable tokens from day one, the game attracts farmers and bots before real players. Keeping gameplay rewards off-chain first protects the economy and lets the team balance fun before money enters the loop.

## Early `$AETHER` utility

Safe first utilities:

```text
Cosmetic palettes
Founder badge
Nameplate frame
Pet skin
Town banner
Profile border
Event participation badge
```

Avoid early utilities:

```text
XP boosters
stat boosts
loot boxes
paid dungeon keys that improve rewards
staking yield
token rewards for daily login
revenue share
```

## Emission policy

Prototype:

```text
No real $AETHER emissions.
Devnet only.
```

Beta:

```text
Still no tradable token rewards by default.
Use off-chain rewards.
```

Future seasonal rewards only if all gates pass:

```text
server-authoritative combat
anti-bot system
treasury budget
legal review
hard daily cap
hard season cap
reward abuse monitoring
```

## Sinks

Good sinks:

```text
cosmetics
cosmetic crafting
season badge mint/claim fee
nameplate customization
house/town decoration later
community event entry where legally appropriate
```

Bad sinks:

```text
required payment to play basic game
power progression
mandatory dungeon entry
randomized paid loot with financial upside
```

## Economy dashboard

Track from day one:

```text
daily active players
new players
guest-to-wallet conversion
quest starts
quest completions
dungeon starts
dungeon clears
shop opens
purchase attempts
purchase successes
failed transactions
$AETHER spent
gold earned
gold spent
inventory grants
suspicious repeated runs
```

## Treasury rule

Before any token reward system exists:

```text
Max weekly tradable-token outflow must be hard-capped.
No automated token rewards without a treasury budget and kill switch.
```

Example future cap:

```text
weekly_reward_budget = min(fixed_season_budget_remaining, 1% to 2% of treasury allocation)
```

## Invalidation signals

Stop or delay token utility expansion if:

```text
more bots than players
wallet conversion is high but demo completion is low
most buyers never play the game
support requests focus only on price
social channels turn into trading calls
server cannot detect replay/farming
```
