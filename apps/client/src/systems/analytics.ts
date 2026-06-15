// Lightweight, offline-first funnel analytics for the dungeon loop. Records
// progression milestones as persisted counters so an operator can read the
// completion funnel without any backend. Pure aggregation lives in
// summarizeFunnel() for testing; persistence degrades gracefully where
// localStorage is unavailable (private mode / Node tests).

export type FunnelEvent =
  | 'dungeon_entered'
  | 'battle_started'
  | 'enemy_defeated'
  | 'boss_reached'
  | 'boss_defeated'
  | 'hero_defeated'
  | 'shrine_used'
  | 'dungeon_retreat';

export const FUNNEL_EVENTS: FunnelEvent[] = [
  'dungeon_entered',
  'battle_started',
  'enemy_defeated',
  'boss_reached',
  'boss_defeated',
  'hero_defeated',
  'shrine_used',
  'dungeon_retreat',
];

export type FunnelCounts = Record<FunnelEvent, number>;

export interface FunnelSummary {
  counts: FunnelCounts;
  /** Dungeon runs started. */
  runs: number;
  reachedBoss: number;
  cleared: number;
  deaths: number;
  /** Fraction of runs that reached the boss (0 when no runs). */
  bossReachRate: number;
  /** Fraction of runs that cleared the boss (0 when no runs). */
  clearRate: number;
}

const STORAGE_KEY = 'chronofrost.funnel.v1';

function zeroCounts(): FunnelCounts {
  return {
    dungeon_entered: 0,
    battle_started: 0,
    enemy_defeated: 0,
    boss_reached: 0,
    boss_defeated: 0,
    hero_defeated: 0,
    shrine_used: 0,
    dungeon_retreat: 0,
  };
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__chronofrost_funnel_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function load(): FunnelCounts {
  const storage = safeStorage();
  if (!storage) return zeroCounts();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return zeroCounts();
    const parsed = JSON.parse(raw) as Partial<FunnelCounts>;
    return { ...zeroCounts(), ...parsed };
  } catch {
    return zeroCounts();
  }
}

let counts: FunnelCounts = load();

function persist(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Best effort — analytics must never break gameplay.
  }
}

/** Pure: derive the funnel summary from raw counts. */
export function summarizeFunnel(c: FunnelCounts): FunnelSummary {
  const runs = c.dungeon_entered;
  const reachedBoss = c.boss_reached;
  const cleared = c.boss_defeated;
  return {
    counts: { ...c },
    runs,
    reachedBoss,
    cleared,
    deaths: c.hero_defeated,
    bossReachRate: runs > 0 ? reachedBoss / runs : 0,
    clearRate: runs > 0 ? cleared / runs : 0,
  };
}

export function recordFunnelEvent(event: FunnelEvent): void {
  counts[event] += 1;
  persist();
}

export function getFunnelCounts(): FunnelCounts {
  return { ...counts };
}

export function getFunnelSummary(): FunnelSummary {
  return summarizeFunnel(counts);
}

export function resetFunnel(): void {
  counts = zeroCounts();
  persist();
}

// Expose a read-only console handle so an operator can inspect the funnel in the
// browser without any dashboard: `__chronofrost.funnel()`.
if (typeof window !== 'undefined') {
  (window as unknown as { __chronofrost?: Record<string, unknown> }).__chronofrost = {
    funnel: getFunnelSummary,
    resetFunnel,
  };
}
