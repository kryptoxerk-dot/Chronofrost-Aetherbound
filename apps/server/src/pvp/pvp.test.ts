import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDuelAction,
  createDuelState,
  getCurrentActorId,
  resolveDuel,
  type DuelAction,
} from './duelEngine.js';
import { eligibility } from './eligibility.js';
import { ladder } from './ladder.js';
import { matchmaking } from './matchmaking.js';
import { buildPayoutPlan } from './season.js';
import { pvpRoutes } from '../routes/pvp.js';
import { store } from '../services/inMemoryStore.js';

describe('duel engine determinism and balance', () => {
  it('same seed + same actions => identical result (replayable)', () => {
    const a1: DuelAction[] = ['attack', 'freeze', 'attack', 'defend', 'attack'];
    const a2: DuelAction[] = ['attack', 'attack', 'freeze', 'attack', 'attack'];
    const r1 = resolveDuel({ seed: 12345, p1: { id: 'a', name: 'A' }, p2: { id: 'b', name: 'B' }, actions1: a1, actions2: a2 });
    const r2 = resolveDuel({ seed: 12345, p1: { id: 'a', name: 'A' }, p2: { id: 'b', name: 'B' }, actions1: a1, actions2: a2 });
    expect(r1.winnerId).toBe(r2.winnerId);
    expect(r1.finalHp).toEqual(r2.finalHp);
    expect(r1.turns).toBe(r2.turns);
  });

  it('always terminates within the turn cap', () => {
    const r = resolveDuel({
      seed: 7, p1: { id: 'a', name: 'A' }, p2: { id: 'b', name: 'B' },
      actions1: Array(500).fill('defend'), actions2: Array(500).fill('defend'),
      maxTurns: 200,
    });
    expect(r.turns).toBeLessThanOrEqual(200);
  });

  it('defend actually reduces incoming damage', () => {
    const guarded = createDuelState({ seed: 5, p1: { id: 'a', name: 'A' }, p2: { id: 'b', name: 'B' } });
    const open = createDuelState({ seed: 5, p1: { id: 'a', name: 'A' }, p2: { id: 'b', name: 'B' } });

    // Force deterministic order: A defends, then B attacks.
    guarded.tieBreakerId = 'a';
    guarded.fighters.p1.nextTurn = 0;
    guarded.fighters.p2.nextTurn = 1;
    applyDuelAction(guarded, 'a', 'defend');
    guarded.fighters.p2.nextTurn = guarded.fighters.p1.nextTurn - 1;
    applyDuelAction(guarded, 'b', 'attack');

    open.tieBreakerId = 'b';
    open.fighters.p1.nextTurn = 0;
    open.fighters.p2.nextTurn = 0;
    applyDuelAction(open, 'b', 'attack');

    const guardedDamage = guarded.fighters.p1.maxHp - guarded.fighters.p1.hp;
    const openDamage = open.fighters.p1.maxHp - open.fighters.p1.hp;
    expect(guardedDamage).toBeLessThan(openDamage);
  });

  it('no basic spam strategy dominates every other basic strategy above 60%', () => {
    const strategies: Record<string, DuelAction[]> = {
      attack: Array(80).fill('attack'),
      freeze: Array(80).fill('freeze'),
      defend: Array(80).fill('defend'),
    };

    for (const [leftName, leftActions] of Object.entries(strategies)) {
      let dominantAgainstAll = true;
      for (const [rightName, rightActions] of Object.entries(strategies)) {
        if (leftName === rightName) continue;
        let wins = 0;
        for (let seed = 1; seed <= 120; seed++) {
          const result = resolveDuel({
            seed,
            p1: { id: 'left', name: 'Left' },
            p2: { id: 'right', name: 'Right' },
            actions1: leftActions,
            actions2: rightActions,
          });
          if (result.winnerId === 'left') wins += 1;
        }
        const rate = wins / 120;
        if (rate <= 0.6) dominantAgainstAll = false;
      }
      expect(dominantAgainstAll, `${leftName} should not dominate all basic strategies`).toBe(false);
    }
  });
});

describe('ranked ladder', () => {
  beforeEach(() => {
    ladder._reset();
    matchmaking._reset();
    eligibility._reset();
  });

  it('updates Elo and records a replay-verifiable match', () => {
    const rec = ladder.resolveRanked({
      matchId: '11111111-1111-1111-1111-111111111111',
      seed: 999,
      p1: { id: 'alice', name: 'Alice' },
      p2: { id: 'bob', name: 'Bob' },
      actions1: ['attack', 'attack', 'freeze', 'attack', 'attack', 'attack'],
      actions2: ['defend', 'attack', 'attack', 'attack', 'attack', 'attack'],
    });
    const alice = ladder.getPlayer('alice')!;
    const bob = ladder.getPlayer('bob')!;
    expect(alice.rating + bob.rating).toBe(2000);
    const v = ladder.verifyMatch(rec.matchId);
    expect(v.ok).toBe(true);
  });

  it('detects a tampered combat result on replay', () => {
    const rec = ladder.resolveRanked({
      matchId: '22222222-2222-2222-2222-222222222222',
      seed: 4242,
      p1: { id: 'x', name: 'X' }, p2: { id: 'y', name: 'Y' },
      actions1: ['attack', 'attack', 'attack', 'attack', 'attack'],
      actions2: ['attack', 'attack', 'attack', 'attack', 'attack'],
    });
    ladder._mutateMatchForTests(rec.matchId, (stored) => {
      stored.winnerId = stored.winnerId === 'x' ? 'y' : 'x';
    });
    expect(ladder.verifyMatch(rec.matchId).ok).toBe(false);
  });
});

describe('server-authoritative matchmaking', () => {
  beforeEach(() => {
    ladder._reset();
    matchmaking._reset();
    eligibility._reset();
  });

  it('binds match participants to server-side player refs and rejects non-participants', () => {
    const a = { id: 'wallet-a', name: 'A' };
    const b = { id: 'wallet-b', name: 'B' };
    const match = matchmaking._createMatchForTests(a, b, 42, { p1: a, p2: b });

    expect(() => matchmaking.submitAction(match.matchId, 'wallet-c', 'attack')).toThrow('not a match participant');
  });

  it('only accepts the current-turn player action', () => {
    const a = { id: 'wallet-a', name: 'A' };
    const b = { id: 'wallet-b', name: 'B' };
    const match = matchmaking._createMatchForTests(a, b, 42, { p1: a, p2: b });
    const current = getCurrentActorId(match.duel)!;
    const other = current === a.id ? b.id : a.id;

    expect(() => matchmaking.submitAction(match.matchId, other, 'attack')).toThrow('not this player turn');
    const state = matchmaking.submitAction(match.matchId, current, 'attack');
    expect(state.turns).toBe(1);
  });

  it('server randomizes side assignment through queue; caller cannot submit p1/p2', () => {
    const a = matchmaking.queuePlayer({ id: 'wallet-a', name: 'A' });
    expect(a.status).toBe('queued');
    const b = matchmaking.queuePlayer({ id: 'wallet-b', name: 'B' });
    expect(b.status).toBe('matched');
    if (b.status === 'matched') {
      const ids = [b.match.p1.id, b.match.p2.id].sort();
      expect(ids).toEqual(['wallet-a', 'wallet-b']);
    }
  });
});

describe('pvp routes', () => {
  beforeEach(() => {
    store._resetForTests();
    ladder._reset();
    matchmaking._reset();
    eligibility._reset();
  });

  it('requires auth for queue and ignores client-supplied p1/p2 identity', async () => {
    const app = Fastify();
    await app.register(pvpRoutes);

    const unauth = await app.inject({ method: 'POST', url: '/pvp/queue', payload: { name: 'Anon' } });
    expect(unauth.statusCode).toBe(401);

    const s1 = store.createSession('wallet-route-a');
    const s2 = store.createSession('wallet-route-b');

    const q1 = await app.inject({
      method: 'POST',
      url: '/pvp/queue',
      headers: { authorization: `Bearer ${s1.token}` },
      payload: { name: 'Alice', p1: { id: 'spoof' } },
    });
    expect(q1.statusCode).toBe(200);
    expect(q1.json().status).toBe('queued');

    const q2 = await app.inject({
      method: 'POST',
      url: '/pvp/queue',
      headers: { authorization: `Bearer ${s2.token}` },
      payload: { name: 'Bob', p2: { id: 'spoof' } },
    });
    expect(q2.statusCode).toBe(200);
    const body = q2.json();
    expect(body.status).toBe('matched');
    expect([body.match.p1.id, body.match.p2.id].sort()).toEqual(['wallet-route-a', 'wallet-route-b']);
    expect([body.match.p1.id, body.match.p2.id]).not.toContain('spoof');
  });

  it('has no public one-shot /pvp/match endpoint anymore', async () => {
    const app = Fastify();
    await app.register(pvpRoutes);
    const res = await app.inject({ method: 'POST', url: '/pvp/match', payload: {} });
    expect(res.statusCode).toBe(404);
  });
});

describe('studio-funded season payout', () => {
  beforeEach(() => { ladder._reset(); eligibility._reset(); });

  it('splits a studio pool by rank, integer-safe, never from players', () => {
    for (const [id, seed] of [['p1', 1], ['p2', 2], ['p3', 3], ['p4', 4]] as const) {
      ladder.resolveRanked({
        matchId: `m-${id}`, seed,
        p1: { id, name: id }, p2: { id: `${id}-opp`, name: 'opp' },
        actions1: ['attack', 'attack', 'attack', 'attack', 'attack', 'attack'],
        actions2: ['defend', 'defend', 'defend', 'defend', 'defend', 'defend'],
      });
    }
    const plan = buildPayoutPlan({
      seasonId: 's1',
      distribution: [0.5, 0.3, 0.2],
      prizePoolRaw: '1000000',
      decimals: 6,
      fundedByStudio: true,
    });
    expect(plan.fundedBy).toBe('studio-treasury');
    expect(plan.payouts).toHaveLength(3);
    const sum = plan.payouts.reduce((a, p) => a + BigInt(p.amountRaw), 0n);
    expect(sum).toBe(500000n + 300000n + 200000n);
  });

  it('rejects distribution over 100%', () => {
    expect(() =>
      buildPayoutPlan({ seasonId: 's', distribution: [0.7, 0.5], prizePoolRaw: '100', decimals: 6, fundedByStudio: true }),
    ).toThrow();
  });
});
