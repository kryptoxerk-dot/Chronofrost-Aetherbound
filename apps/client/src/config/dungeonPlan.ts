import type { EnemyId } from '../systems/combat';

export type DungeonNode =
  | {
      kind: 'enemy';
      id: string;
      x: number;
      y: number;
      enemyId: EnemyId;
      isBoss?: false;
    }
  | {
      kind: 'boss';
      id: string;
      x: number;
      y: number;
      enemyId: EnemyId;
      isBoss: true;
    }
  | {
      kind: 'shrine';
      id: string;
      x: number;
      y: number;
      healHp: number;
      restoreMp: number;
    };

export const FROSTGLASS_CAVERN_NODES: DungeonNode[] = [
  { kind: 'enemy', id: 'slime-entry', x: 86, y: 96, enemyId: 'frost_slime' },
  { kind: 'enemy', id: 'wraith-crossing', x: 150, y: 198, enemyId: 'clock_wraith' },
  { kind: 'shrine', id: 'aether-shrine', x: 204, y: 118, healHp: 12, restoreMp: 4 },
  { kind: 'enemy', id: 'golem-gate', x: 240, y: 206, enemyId: 'crystal_golem' },
  { kind: 'boss', id: 'chrono-warden', x: 292, y: 122, enemyId: 'chrono_warden', isBoss: true },
];

export function dungeonEnemyIds(): EnemyId[] {
  return FROSTGLASS_CAVERN_NODES
    .filter((node): node is Extract<DungeonNode, { kind: 'enemy' | 'boss' }> => node.kind === 'enemy' || node.kind === 'boss')
    .map((node) => node.enemyId);
}
