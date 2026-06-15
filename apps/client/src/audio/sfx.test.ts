import { describe, it, expect } from 'vitest';
import { SFX_SPECS, shouldPlaySfx, playSfx, type SfxName } from './sfx';

const NAMES: SfxName[] = ['select', 'attack', 'freeze', 'defend', 'hit', 'victory', 'defeat', 'purchase'];

describe('sfx', () => {
  it('defines a valid tone spec for every cue', () => {
    for (const name of NAMES) {
      const spec = SFX_SPECS[name];
      expect(spec, name).toBeDefined();
      expect(spec.freq).toBeGreaterThan(0);
      expect(spec.durationMs).toBeGreaterThan(0);
      expect(spec.gain).toBeGreaterThan(0);
      expect(spec.gain).toBeLessThanOrEqual(1);
      if (spec.sweepTo !== undefined) expect(spec.sweepTo).toBeGreaterThan(0);
    }
    expect(Object.keys(SFX_SPECS).sort()).toEqual([...NAMES].sort());
  });

  it('shouldPlaySfx requires unmuted and an available audio backend', () => {
    expect(shouldPlaySfx(false, true)).toBe(true);
    expect(shouldPlaySfx(true, true)).toBe(false);
    expect(shouldPlaySfx(false, false)).toBe(false);
    expect(shouldPlaySfx(true, false)).toBe(false);
  });

  it('playSfx is a safe no-op without Web Audio (Node/test env)', () => {
    expect(() => playSfx('attack')).not.toThrow();
    expect(() => playSfx('victory')).not.toThrow();
  });
});
