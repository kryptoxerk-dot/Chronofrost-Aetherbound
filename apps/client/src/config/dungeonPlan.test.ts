import { describe, expect, it } from 'vitest';
import { ENEMY_CONFIG } from './balance';
import { FROSTGLASS_CAVERN_NODES, dungeonEnemyIds } from './dungeonPlan';

describe('Frostglass Cavern launch plan', () => {
  it('contains three enemy archetypes, one shrine, and the Chrono Warden boss', () => {
    const enemyIds = dungeonEnemyIds();

    expect(enemyIds).toEqual(['frost_slime', 'clock_wraith', 'crystal_golem', 'chrono_warden']);
    expect(new Set(enemyIds)).toHaveLength(4);
    expect(FROSTGLASS_CAVERN_NODES.filter((node) => node.kind === 'shrine')).toHaveLength(1);
    expect(FROSTGLASS_CAVERN_NODES.at(-1)).toMatchObject({ kind: 'boss', enemyId: 'chrono_warden' });
  });

  it('only references configured enemies with positive rewards', () => {
    for (const enemyId of dungeonEnemyIds()) {
      expect(ENEMY_CONFIG[enemyId]).toBeTruthy();
      expect(ENEMY_CONFIG[enemyId].xp).toBeGreaterThan(0);
      expect(ENEMY_CONFIG[enemyId].gold).toBeGreaterThan(0);
    }
  });
});
