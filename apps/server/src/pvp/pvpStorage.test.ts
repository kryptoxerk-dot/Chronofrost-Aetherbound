import { describe, it, expect, afterEach } from 'vitest';
import { initPvpStorage, getPvpStorage, getPgStorageHandle, closePvpStorage } from './pvpStorage.js';

describe('pvp storage composition root', () => {
  afterEach(async () => {
    await closePvpStorage();
  });

  it('defaults to a working in-memory repository bundle', async () => {
    const repos = await initPvpStorage({ adapter: 'memory' });
    expect(getPvpStorage()).toBe(repos);
    expect(getPgStorageHandle()).toBeNull();

    // The memory adapter delegates to the ladder singleton (new players start at
    // the default rating). The point here is that the bundle round-trips.
    const saved = await repos.players.upsertRankedPlayer({
      id: 'wallet-route-alice',
      name: 'Alice',
      rating: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(saved).toMatchObject({ id: 'wallet-route-alice', name: 'Alice' });
    expect(await repos.players.getRankedPlayer('wallet-route-alice')).toMatchObject({ id: 'wallet-route-alice' });
  });

  it('returns the same bundle on repeated init (idempotent)', async () => {
    const first = await initPvpStorage({ adapter: 'memory' });
    const second = await initPvpStorage({ adapter: 'memory' });
    expect(second).toBe(first);
  });

  it('requires DATABASE_URL in postgres mode', async () => {
    await expect(initPvpStorage({ adapter: 'postgres', databaseUrl: '' })).rejects.toThrow(/DATABASE_URL/);
  });

  it('throws if getPvpStorage is called before init', async () => {
    await closePvpStorage();
    expect(() => getPvpStorage()).toThrow(/not initialized/);
  });
});
