export const HERO_CONFIG = {
  id: 'aether_knight',
  name: 'Aether Knight',
  maxHp: 32,
  maxMp: 10,
  attack: 7,
  defense: 3,
  speed: 8,
  critChance: 0.08,
};

export const ENEMY_CONFIG = {
  frost_slime: {
    id: 'frost_slime',
    name: 'Frost Slime',
    maxHp: 14,
    attack: 4,
    defense: 1,
    speed: 5,
    xp: 5,
    gold: 8,
  },
  clock_wraith: {
    id: 'clock_wraith',
    name: 'Clock Wraith',
    maxHp: 12,
    attack: 5,
    defense: 1,
    speed: 9,
    xp: 7,
    gold: 10,
  },
  crystal_golem: {
    id: 'crystal_golem',
    name: 'Crystal Golem',
    maxHp: 24,
    attack: 6,
    defense: 4,
    speed: 4,
    xp: 12,
    gold: 16,
  },
  chrono_warden: {
    id: 'chrono_warden',
    name: 'Chrono Warden',
    maxHp: 44,
    attack: 8,
    defense: 3,
    speed: 6,
    xp: 25,
    gold: 40,
  },
} as const;

// All combat tuning lives here so balancing never requires touching engine code.
export const COMBAT_CONFIG = {
  // Lower = acts sooner. A combatant's wait between actions is BASE / speed.
  timelineBase: 48,
  // Minimum damage dealt by a physical hit after defense is applied.
  minHitDamage: 1,
  // Chronofreeze: ignores part of defense, costs MP, and pushes the target
  // further down the timeline so the hero can act multiple times in a row.
  freeze: {
    mpCost: 3,
    damage: 8,
    defenseIgnored: 2,
    // Added to the target's current wait, in timeline units.
    delay: 22,
  },
  // Defending halves the next incoming hit and is consumed when hit.
  defend: {
    damageMultiplier: 0.5,
  },
  // MP regained at the start of every hero action.
  mpRegenPerTurn: 1,
} as const;

export const SHOP_ITEMS = [
  {
    id: 'founder_palette',
    name: 'Founder Palette',
    description: 'Cosmetic GameBoy palette. No gameplay advantage.',
    priceGold: 50,
    priceAetherRaw: '1000000',
    decimals: 6,
  },
  {
    id: 'frostlight_frame',
    name: 'Frostlight Frame',
    description: 'Cosmetic nameplate frame. No gameplay advantage.',
    priceGold: 80,
    priceAetherRaw: '2000000',
    decimals: 6,
  },
];
