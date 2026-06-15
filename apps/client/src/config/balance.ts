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

// Enemy AI flavor. Behavior is probability-driven and resolved through the
// shared seeded rng, so the deterministic default rng (no roll passes) always
// yields a plain attack — keeping headless sims/tests stable while live play
// (Math.random) gets variety.
export type EnemySpecial = 'surge' | 'haste';

export interface EnemyBehavior {
  /** Chance to brace (halve the hero's next hit) instead of attacking. */
  guardChance: number;
  /** Chance to use its special instead of a normal attack. */
  specialChance: number;
  special?: EnemySpecial;
  /** 'surge': attack damage multiplier. */
  surgeMultiplier?: number;
  /** 'haste': timeline units shaved off its next wait (acts sooner). */
  hasteAmount?: number;
}

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
    // Tutorial foe: pure attacker.
    behavior: { guardChance: 0, specialChance: 0 } as EnemyBehavior,
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
    // Fast striker that sometimes blurs forward to act again sooner.
    behavior: { guardChance: 0, specialChance: 0.3, special: 'haste', hasteAmount: 2 } as EnemyBehavior,
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
    // Defensive wall: often braces, so physical hits are weak — Chronofreeze
    // (which ignores armor) is the answer.
    behavior: { guardChance: 0.4, specialChance: 0 } as EnemyBehavior,
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
    // Boss: a heavy Temporal Surge and the occasional guard.
    behavior: { guardChance: 0.1, specialChance: 0.25, special: 'surge', surgeMultiplier: 1.6 } as EnemyBehavior,
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
  // Defending halves the next incoming hit (consumed when hit) AND draws in
  // aether, restoring MP. This makes Defend a real tempo/resource move — brace
  // against a big blow while refueling Chronofreeze — instead of a dead turn.
  defend: {
    damageMultiplier: 0.5,
    mpBonus: 2,
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
