// Ranked ladder: Elo rating + durable-match-record interface.
//
// In this package the implementation is in-memory for dev speed. The public
// shape is intentionally repository-like so it can be replaced by Postgres
// before real prizes are paid.

import { resolveDuel, type DuelAction } from './duelEngine.js';

export type RankedPlayer = {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: string;
};

export type MatchCompletionReason = 'combat' | 'forfeit' | 'timeout';

export type MatchRecord = {
  matchId: string;
  seed: number;
  p1Id: string;
  p2Id: string;
  actions1: DuelAction[];
  actions2: DuelAction[];
  winnerId: string | null;
  ratingDelta: Record<string, number>;
  completionReason: MatchCompletionReason;
  finalHp?: Record<string, number>;
  createdAt: string;
};

const players = new Map<string, RankedPlayer>();
const matches = new Map<string, MatchRecord>();

const START_RATING = 1000;
const K = 32;

function clonePlayer(p: RankedPlayer): RankedPlayer {
  return { ...p };
}

function cloneMatch(m: MatchRecord): MatchRecord {
  return {
    ...m,
    actions1: [...m.actions1],
    actions2: [...m.actions2],
    ratingDelta: { ...m.ratingDelta },
    finalHp: m.finalHp ? { ...m.finalHp } : undefined,
  };
}

function getOrCreate(id: string, name: string): RankedPlayer {
  let p = players.get(id);
  if (!p) {
    p = { id, name, rating: START_RATING, wins: 0, losses: 0, draws: 0, updatedAt: new Date().toISOString() };
    players.set(id, p);
  } else if (name && p.name !== name) {
    p.name = name;
  }
  return p;
}

function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function updateElo(p1: RankedPlayer, p2: RankedPlayer, winnerId: string | null): Record<string, number> {
  const e1 = expectedScore(p1.rating, p2.rating);
  const e2 = expectedScore(p2.rating, p1.rating);
  let s1: number;
  let s2: number;

  if (winnerId === p1.id) {
    s1 = 1;
    s2 = 0;
    p1.wins += 1;
    p2.losses += 1;
  } else if (winnerId === p2.id) {
    s1 = 0;
    s2 = 1;
    p2.wins += 1;
    p1.losses += 1;
  } else {
    s1 = 0.5;
    s2 = 0.5;
    p1.draws += 1;
    p2.draws += 1;
  }

  const d1 = Math.round(K * (s1 - e1));
  const d2 = Math.round(K * (s2 - e2));
  p1.rating += d1;
  p2.rating += d2;
  const now = new Date().toISOString();
  p1.updatedAt = now;
  p2.updatedAt = now;
  return { [p1.id]: d1, [p2.id]: d2 };
}

export const ladder = {
  ensurePlayer(id: string, name: string): RankedPlayer {
    return clonePlayer(getOrCreate(id, name));
  },

  getPlayer(id: string): RankedPlayer | undefined {
    const p = players.get(id);
    return p ? clonePlayer(p) : undefined;
  },

  leaderboard(limit = 50): RankedPlayer[] {
    return [...players.values()].sort((a, b) => b.rating - a.rating).slice(0, limit).map(clonePlayer);
  },

  getMatch(matchId: string): MatchRecord | undefined {
    const m = matches.get(matchId);
    return m ? cloneMatch(m) : undefined;
  },

  listPlayers(): RankedPlayer[] {
    return [...players.values()].map(clonePlayer);
  },

  listMatches(): MatchRecord[] {
    return [...matches.values()].map(cloneMatch);
  },

  recordResolvedMatch(params: {
    matchId: string;
    seed: number;
    p1: { id: string; name: string };
    p2: { id: string; name: string };
    actions1: DuelAction[];
    actions2: DuelAction[];
    winnerId: string | null;
    completionReason: MatchCompletionReason;
    finalHp?: Record<string, number>;
  }): MatchRecord {
    if (matches.has(params.matchId)) throw new Error('match already recorded');
    if (params.p1.id === params.p2.id) throw new Error('ranked match requires two distinct players');

    const p1 = getOrCreate(params.p1.id, params.p1.name);
    const p2 = getOrCreate(params.p2.id, params.p2.name);
    const ratingDelta = updateElo(p1, p2, params.winnerId);

    const record: MatchRecord = {
      matchId: params.matchId,
      seed: params.seed,
      p1Id: params.p1.id,
      p2Id: params.p2.id,
      actions1: [...params.actions1],
      actions2: [...params.actions2],
      winnerId: params.winnerId,
      ratingDelta,
      completionReason: params.completionReason,
      finalHp: params.finalHp ? { ...params.finalHp } : undefined,
      createdAt: new Date().toISOString(),
    };
    matches.set(params.matchId, record);
    return cloneMatch(record);
  },

  /** Resolve a full ranked match authoritatively and update Elo. */
  resolveRanked(params: {
    matchId: string;
    seed: number;
    p1: { id: string; name: string };
    p2: { id: string; name: string };
    actions1: DuelAction[];
    actions2: DuelAction[];
  }): MatchRecord {
    const result = resolveDuel({
      seed: params.seed,
      p1: params.p1,
      p2: params.p2,
      actions1: params.actions1,
      actions2: params.actions2,
    });

    return this.recordResolvedMatch({
      matchId: params.matchId,
      seed: params.seed,
      p1: params.p1,
      p2: params.p2,
      actions1: params.actions1,
      actions2: params.actions2,
      winnerId: result.winnerId,
      completionReason: 'combat',
      finalHp: result.finalHp,
    });
  },

  /** Replay a recorded combat match and confirm the stored winner is reproducible. */
  verifyMatch(matchId: string): { ok: boolean; reason?: string } {
    const m = matches.get(matchId);
    if (!m) return { ok: false, reason: 'match not found' };
    if (m.completionReason !== 'combat') return { ok: true };

    const replay = resolveDuel({
      seed: m.seed,
      p1: { id: m.p1Id, name: m.p1Id },
      p2: { id: m.p2Id, name: m.p2Id },
      actions1: m.actions1,
      actions2: m.actions2,
    });
    if (replay.winnerId !== m.winnerId) return { ok: false, reason: 'replay winner mismatch' };
    return { ok: true };
  },

  /**
   * Load durable ranked players into the live ladder (used on boot in postgres
   * mode so ratings/records survive restarts). Existing in-memory entries are
   * overwritten by the loaded snapshot.
   */
  hydrate(loaded: RankedPlayer[]): number {
    for (const player of loaded) {
      players.set(player.id, clonePlayer(player));
    }
    return players.size;
  },

  _mutateMatchForTests(matchId: string, mutator: (record: MatchRecord) => void) {
    const found = matches.get(matchId);
    if (found) mutator(found);
  },

  _reset() { players.clear(); matches.clear(); }, // test helper
};
