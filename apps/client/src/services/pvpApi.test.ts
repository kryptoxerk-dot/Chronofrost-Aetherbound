import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLeaderboard,
  queueForPvp,
  submitPvpAction,
  forfeitPvpMatch,
  getMyPvpEligibility,
  isMatchState,
  type PublicMatchState,
} from './pvpApi';

const calls: Array<{ url: string; init?: RequestInit }> = [];

function mockFetch(status: number, body: unknown): typeof fetch {
  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

const liveMatch: PublicMatchState = {
  matchId: 'm1', status: 'active', p1: { id: 'me', name: 'Me' }, p2: { id: 'opp', name: 'Op' },
  viewerId: 'me', currentTurnPlayerId: 'me', yourTurn: true, turnDeadlineAt: null, turns: 0, time: 0,
  fighters: [], winnerId: null, recentLog: [],
};

describe('pvpApi', () => {
  beforeEach(() => {
    calls.length = 0;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the public leaderboard without an auth header', async () => {
    globalThis.fetch = mockFetch(200, [{ id: 'a', name: 'A', rating: 1200, wins: 1, losses: 0, draws: 0, updatedAt: '' }]);
    const board = await getLeaderboard(5);
    expect(board).toHaveLength(1);
    expect(calls[0].url).toContain('/pvp/leaderboard?limit=5');
    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('sends the session token as a Bearer header on ranked calls', async () => {
    globalThis.fetch = mockFetch(200, { status: 'queued', playerId: 'me' });
    const result = await queueForPvp('sess-123', 'Hero');
    expect(result).toEqual({ status: 'queued', playerId: 'me' });
    expect(calls[0].url).toContain('/pvp/queue');
    expect(calls[0].init?.method).toBe('POST');
    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sess-123');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ name: 'Hero' });
  });

  it('submits an action and returns the new match state', async () => {
    globalThis.fetch = mockFetch(200, liveMatch);
    const state = await submitPvpAction('sess', 'm1', 'freeze');
    expect(state.matchId).toBe('m1');
    expect(calls[0].url).toContain('/pvp/matches/m1/action');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ action: 'freeze' });
  });

  it('forfeits a match', async () => {
    globalThis.fetch = mockFetch(200, { ...liveMatch, status: 'complete', winnerId: 'opp' });
    const state = await forfeitPvpMatch('sess', 'm1');
    expect(state.status).toBe('complete');
    expect(calls[0].url).toContain('/pvp/matches/m1/forfeit');
  });

  it('throws the server error message on a non-2xx response', async () => {
    globalThis.fetch = mockFetch(401, { error: 'authentication required' });
    await expect(getMyPvpEligibility('sess')).rejects.toThrow('authentication required');
  });

  it('isMatchState distinguishes an active match from the "none" sentinel', () => {
    expect(isMatchState(liveMatch)).toBe(true);
    expect(isMatchState({ status: 'none' })).toBe(false);
  });
});
