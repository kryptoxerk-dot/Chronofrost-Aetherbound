# Game Balance Config Draft

```ts
export const HERO = {
  hp: 32,
  mp: 10,
  attack: 7,
  defense: 3,
  speed: 8,
  critChance: 0.08,
};

export const ENEMIES = {
  frost_slime: { hp: 14, attack: 4, defense: 1, speed: 5, xp: 5, gold: 8 },
  clock_wraith: { hp: 12, attack: 5, defense: 1, speed: 9, xp: 7, gold: 10 },
  crystal_golem: { hp: 24, attack: 6, defense: 4, speed: 3, xp: 10, gold: 15 },
  chrono_warden: { hp: 45, attack: 8, defense: 3, speed: 6, xp: 25, gold: 40 },
};

export const SKILLS = {
  slash: { mpCost: 0, damageMod: 1.0 },
  chronofreeze: { mpCost: 3, damageMod: 0.6, delay: 35 },
  frost_guard: { mpCost: 0, defendMultiplier: 0.5 },
};

export const SHOP = {
  founder_palette: { priceGold: 50, priceAetherRaw: '1000000', decimals: 6 },
  frostlight_frame: { priceGold: 80, priceAetherRaw: '2000000', decimals: 6 },
};
```
