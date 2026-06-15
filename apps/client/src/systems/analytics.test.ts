import { describe, it, expect, beforeEach } from 'vitest';
import {
  FUNNEL_EVENTS,
  getFunnelCounts,
  getFunnelSummary,
  recordFunnelEvent,
  resetFunnel,
  summarizeFunnel,
  type FunnelCounts,
} from './analytics';

function counts(overrides: Partial<FunnelCounts> = {}): FunnelCounts {
  const base = Object.fromEntries(FUNNEL_EVENTS.map((e) => [e, 0])) as FunnelCounts;
  return { ...base, ...overrides };
}

describe('funnel analytics', () => {
  beforeEach(() => resetFunnel());

  it('summarizeFunnel derives rates and guards divide-by-zero', () => {
    expect(summarizeFunnel(counts())).toMatchObject({ runs: 0, bossReachRate: 0, clearRate: 0 });

    const s = summarizeFunnel(counts({ dungeon_entered: 4, boss_reached: 3, boss_defeated: 1, hero_defeated: 2 }));
    expect(s.runs).toBe(4);
    expect(s.reachedBoss).toBe(3);
    expect(s.cleared).toBe(1);
    expect(s.deaths).toBe(2);
    expect(s.bossReachRate).toBeCloseTo(0.75);
    expect(s.clearRate).toBeCloseTo(0.25);
  });

  it('records events as counters', () => {
    recordFunnelEvent('dungeon_entered');
    recordFunnelEvent('battle_started');
    recordFunnelEvent('battle_started');
    recordFunnelEvent('enemy_defeated');

    const c = getFunnelCounts();
    expect(c.dungeon_entered).toBe(1);
    expect(c.battle_started).toBe(2);
    expect(c.enemy_defeated).toBe(1);
    expect(c.boss_defeated).toBe(0);
  });

  it('models a full clear run as a funnel', () => {
    // entered -> 4 battles -> 3 normal kills -> boss reached -> boss cleared
    recordFunnelEvent('dungeon_entered');
    for (let i = 0; i < 3; i += 1) {
      recordFunnelEvent('battle_started');
      recordFunnelEvent('enemy_defeated');
    }
    recordFunnelEvent('battle_started');
    recordFunnelEvent('boss_reached');
    recordFunnelEvent('enemy_defeated');
    recordFunnelEvent('boss_defeated');

    const s = getFunnelSummary();
    expect(s.runs).toBe(1);
    expect(s.reachedBoss).toBe(1);
    expect(s.cleared).toBe(1);
    expect(s.clearRate).toBe(1);
    expect(s.counts.enemy_defeated).toBe(4);
  });

  it('resetFunnel clears all counters', () => {
    recordFunnelEvent('dungeon_entered');
    resetFunnel();
    expect(getFunnelSummary().runs).toBe(0);
  });
});
