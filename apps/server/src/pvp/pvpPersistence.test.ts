import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerMatchPersistence, persistCompletedMatch, type CompletedMatchSink } from './pvpPersistence.js';
import { ladder, type MatchRecord, type RankedPlayer } from './ladder.js';
import { matchmaking } from './matchmaking.js';

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function record(): MatchRecord {
  return {
    matchId: 'm-test',
    seed: 1,
    p1Id: 'a',
    p2Id: 'b',
    actions1: ['attack'],
    actions2: ['defend'],
    winnerId: 'a',
    ratingDelta: { a: 12, b: -12 },
    completionReason: 'combat',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function player(id: string): RankedPlayer {
  return { id, name: id, rating: 1000, wins: 0, losses: 0, draws: 0, updatedAt: '' };
}

class RecordingSink implements CompletedMatchSink {
  upserts: RankedPlayer[] = [];
  matches: MatchRecord[] = [];
  async upsertRankedPlayer(p: RankedPlayer) {
    this.upserts.push(p);
    return p;
  }
  async insertMatch(r: MatchRecord) {
    this.matches.push(r);
    return r;
  }
}

describe('pvp match write-through', () => {
  afterEach(() => {
    registerMatchPersistence(null);
    ladder._reset();
    matchmaking._reset();
  });

  it('persists both players then the match record', async () => {
    const sink = new RecordingSink();
    registerMatchPersistence(sink);

    persistCompletedMatch(record(), [player('a'), player('b')]);
    await flush();

    expect(sink.upserts.map((p) => p.id)).toEqual(['a', 'b']);
    expect(sink.matches).toHaveLength(1);
    expect(sink.matches[0].matchId).toBe('m-test');
  });

  it('is a no-op when no sink is registered', async () => {
    registerMatchPersistence(null);
    expect(() => persistCompletedMatch(record(), [player('a')])).not.toThrow();
    await flush();
  });

  it('routes sink failures to the error handler without throwing', async () => {
    const errors: unknown[] = [];
    const failing: CompletedMatchSink = {
      async upsertRankedPlayer() {
        throw new Error('db down');
      },
      async insertMatch(r) {
        return r;
      },
    };
    registerMatchPersistence(failing, (err) => errors.push(err));

    expect(() => persistCompletedMatch(record(), [player('a')])).not.toThrow();
    await flush();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('db down');
  });

  it('write-through fires when a real match completes via forfeit', async () => {
    const sink = new RecordingSink();
    registerMatchPersistence(sink);

    matchmaking.queuePlayer({ id: 'wallet-aaa', name: 'A' });
    const matched = matchmaking.queuePlayer({ id: 'wallet-bbb', name: 'B' });
    expect(matched.status).toBe('matched');
    const matchId = matched.status === 'matched' ? matched.match.matchId : '';

    matchmaking.forfeit(matchId, 'wallet-aaa');
    await flush();

    expect(sink.matches.map((m) => m.matchId)).toContain(matchId);
    expect(new Set(sink.upserts.map((p) => p.id))).toEqual(new Set(['wallet-aaa', 'wallet-bbb']));
  });
});

describe('ladder hydrate', () => {
  afterEach(() => ladder._reset());

  it('loads durable players into the live leaderboard', () => {
    ladder._reset();
    const count = ladder.hydrate([
      { id: 'x', name: 'X', rating: 1300, wins: 7, losses: 2, draws: 0, updatedAt: '' },
      { id: 'y', name: 'Y', rating: 1100, wins: 3, losses: 4, draws: 1, updatedAt: '' },
    ]);
    expect(count).toBe(2);
    const board = ladder.leaderboard(10);
    expect(board.map((p) => p.id)).toEqual(['x', 'y']);
    expect(board[0]).toMatchObject({ rating: 1300, wins: 7 });
  });
});
