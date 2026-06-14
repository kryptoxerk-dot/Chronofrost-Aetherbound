import { describe, it, expect } from 'vitest';
import { SceneKeys, ALL_SCENE_KEYS } from './sceneKeys';

describe('scene registry', () => {
  it('has no duplicate scene keys', () => {
    expect(new Set(ALL_SCENE_KEYS).size).toBe(ALL_SCENE_KEYS.length);
  });

  it('exposes every declared key with a non-empty value', () => {
    expect(ALL_SCENE_KEYS.length).toBe(Object.keys(SceneKeys).length);
    for (const key of ALL_SCENE_KEYS) {
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    }
  });
});
