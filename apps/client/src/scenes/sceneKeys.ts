// Single source of truth for scene identifiers. Every scene registers under one
// of these keys and every scene transition references them, so a typo surfaces
// as a test/type failure rather than a silent runtime no-op.

export const SceneKeys = {
  Boot: 'Boot',
  Town: 'Town',
  Dungeon: 'Dungeon',
  Battle: 'Battle',
  Shop: 'Shop',
  HUD: 'HUD',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

export const ALL_SCENE_KEYS: SceneKey[] = Object.values(SceneKeys);
