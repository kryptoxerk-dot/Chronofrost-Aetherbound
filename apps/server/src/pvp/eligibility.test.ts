import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildPrivacySafeIdentityObservation, eligibility, type EligibilityRules } from './eligibility.js';
import { ladder, type MatchCompletionReason } from './ladder.js';
import { buildPayoutPlanFromPlayers } from './season.js';
import { matchmaking } from './matchmaking.js';
import { pvpRoutes } from '../routes/pvp.js';
import { env } from '../config/env.js';
import { store } from '../services/inMemoryStore.js';

function rules(overrides: Partial<EligibilityRules> = {}): EligibilityRules {
  return {
    seasonId: 's-test',
    seasonCutoffAt: '9999-12-31T00:00:00.000Z',
    minAccountAgeDays: 0,
    minCompletedMatches: 3,
    minUniqueOpponents: 3,
    maxCountedMatchesPerOpponent: 3,
    maxForfeitRate: 0.2,
    shortMatchMaxActions: 1,
    maxShortMatchRate: 0.5,
    maxIdentityClusterSize: 2,
    fingerprintingEnabled: false,
    fingerprintSalt: 'test-salt',
    testWalletPrefixes: ['test-', 'dev-'],
    adminExcludedWallets: [],
    ...overrides,
  };
}

let matchSeq = 0;
function register(playerId: string, displayName = playerId) {
  eligibility.registerPlayer({ playerId, displayName, walletAuthenticated: true, observedAt: '2026-01-01T00:00:00.000Z' });
}

function record(
  playerId: string,
  opponentId: string,
  winnerId: string | null = playerId,
  completionReason: MatchCompletionReason = 'combat',
  actionCount = 6,
) {
  matchSeq += 1;
  return ladder.recordResolvedMatch({
    matchId: `eligibility-match-${matchSeq}`,
    seed: matchSeq,
    p1: { id: playerId, name: playerId },
    p2: { id: opponentId, name: opponentId },
    actions1: Array(Math.ceil(actionCount / 2)).fill('attack'),
    actions2: Array(Math.floor(actionCount / 2)).fill('attack'),
    winnerId,
    completionReason,
  });
}

function makeEligiblePlayer(playerId: string, opponents = ['o1', 'o2', 'o3']) {
  register(playerId);
  record(playerId, `${playerId}-${opponents[0]}`, playerId);
  record(playerId, `${playerId}-${opponents[1]}`, playerId);
  record(playerId, `${playerId}-${opponents[2]}`, `${playerId}-${opponents[2]}`);
}

describe('pvp prize eligibility and anti-sybil rules', () => {
  beforeEach(() => {
    ladder._reset();
    matchmaking._reset();
    eligibility._reset();
    store._resetForTests();
    matchSeq = 0;
  });

  it('marks wallets with too few matches as ineligible', () => {
    register('wallet-low-activity');
    record('wallet-low-activity', 'opp-1', 'wallet-low-activity');

    const result = eligibility.evaluatePlayer('wallet-low-activity', rules());
    expect(result.status).toBe('ineligible');
    expect(result.eligible).toBe(false);
    expect(result.reasons.join(' ')).toContain('completed ranked matches');
  });

  it('marks wallets with enough matches and unique opponents as eligible', () => {
    makeEligiblePlayer('wallet-legit');

    const result = eligibility.evaluatePlayer('wallet-legit', rules());
    expect(result.status).toBe('eligible');
    expect(result.eligible).toBe(true);
    expect(result.stats.uniqueOpponents).toBe(3);
  });

  it('flags repeated same-opponent farming even when minimum count is met', () => {
    register('wallet-farmer');
    for (let i = 0; i < 4; i += 1) record('wallet-farmer', 'wallet-dump', 'wallet-farmer');

    const result = eligibility.evaluatePlayer('wallet-farmer', rules({ minCompletedMatches: 3, minUniqueOpponents: 1 }));
    expect(result.status).toBe('flagged_review');
    expect(result.warnings.join(' ')).toContain('same-opponent');
  });

  it('flags suspicious forfeit farming', () => {
    register('wallet-forfeit-farm');
    record('wallet-forfeit-farm', 'opp-a', 'wallet-forfeit-farm', 'forfeit');
    record('wallet-forfeit-farm', 'opp-b', 'wallet-forfeit-farm', 'forfeit');
    record('wallet-forfeit-farm', 'opp-c', 'opp-c', 'combat');

    const result = eligibility.evaluatePlayer('wallet-forfeit-farm', rules());
    expect(result.status).toBe('flagged_review');
    expect(result.stats.forfeitRate).toBeGreaterThan(0.2);
  });

  it('excludes admin/test and banned wallets from prize eligibility', () => {
    makeEligiblePlayer('test-wallet');
    makeEligiblePlayer('wallet-banned');
    eligibility.banPlayer('wallet-banned', 'admin', 'abuse confirmed');

    expect(eligibility.evaluatePlayer('test-wallet', rules()).status).toBe('admin_excluded');
    expect(eligibility.evaluatePlayer('wallet-banned', rules()).status).toBe('banned');
  });

  it('flags identity clusters using salted hashes only', () => {
    const r = rules({ fingerprintingEnabled: true, maxIdentityClusterSize: 2, fingerprintSalt: 'cluster-salt' });
    for (const id of ['wallet-c1', 'wallet-c2', 'wallet-c3']) {
      const observation = buildPrivacySafeIdentityObservation(
        { ip: '203.0.113.10', deviceFingerprint: 'device-a', userAgent: 'agent-a' },
        r,
        '2026-01-01T00:00:00.000Z',
      );
      eligibility.registerPlayer({ playerId: id, displayName: id, walletAuthenticated: true, observedAt: '2026-01-01T00:00:00.000Z', identity: observation });
      record(id, `${id}-1`, id);
      record(id, `${id}-2`, id);
      record(id, `${id}-3`, `${id}-3`);
    }

    const result = eligibility.evaluatePlayer('wallet-c1', r);
    expect(result.status).toBe('flagged_review');
    expect(result.warnings.join(' ')).toContain('cluster');
    const profile = eligibility.getProfile('wallet-c1')!;
    expect(profile.identitySignals[0].ipHash).not.toBe('203.0.113.10');
  });

  it('excludes flagged accounts from snapshot-backed payout plans', () => {
    makeEligiblePlayer('wallet-clean-a');
    makeEligiblePlayer('wallet-clean-b');
    makeEligiblePlayer('wallet-flagged-top');
    // Push flagged player up the ladder, then flag it out of automatic payout.
    record('wallet-flagged-top', 'extra-opp-1', 'wallet-flagged-top');
    record('wallet-flagged-top', 'extra-opp-2', 'wallet-flagged-top');
    eligibility.flagPlayer('wallet-flagged-top', 'manual review required', 'high', 'admin');

    const snapshot = eligibility.createSeasonSnapshot('s-test', rules(), { save: true });
    const plan = buildPayoutPlanFromPlayers(
      { seasonId: 's-test', distribution: [0.5, 0.3], prizePoolRaw: '1000000', decimals: 6, fundedByStudio: true },
      snapshot.eligiblePlayers,
    );

    expect(plan.payoutSource).toBe('eligible-season-snapshot');
    expect(plan.payouts.map((p) => p.playerId)).not.toContain('wallet-flagged-top');
    expect(plan.payouts).toHaveLength(2);
  });

  it('admin payout route uses eligible snapshot players, not public request prize config', async () => {
    env.PVP_ADMIN_TOKEN = 'admin-test-token';
    env.PVP_PRIZE_POOL_RAW = '1000000';
    env.PVP_PRIZE_DISTRIBUTION = '0.5,0.3';
    env.PVP_MIN_ACCOUNT_AGE_DAYS = 0;
    env.PVP_MIN_COMPLETED_MATCHES = 3;
    env.PVP_MIN_UNIQUE_OPPONENTS = 3;
    env.PVP_TEST_WALLET_PREFIXES = 'test-,dev-';
    makeEligiblePlayer('clean-route-wallet');
    makeEligiblePlayer('flagged-route-wallet');
    eligibility.flagPlayer('flagged-route-wallet', 'review', 'high', 'admin');

    const app = Fastify();
    await app.register(pvpRoutes);

    const snapshot = await app.inject({
      method: 'POST',
      url: '/admin/pvp/season/s-test/snapshot',
      headers: { 'x-admin-token': 'admin-test-token' },
    });
    expect(snapshot.statusCode).toBe(200);

    const payout = await app.inject({
      method: 'POST',
      url: '/admin/pvp/season/s-test/payout-plan',
      headers: { 'x-admin-token': 'admin-test-token' },
      payload: { prizePoolRaw: '999999999999', distribution: [1] },
    });
    expect(payout.statusCode).toBe(200);
    const body = payout.json();
    expect(body.prizePoolRaw).toBe('1000000');
    expect(body.payoutSource).toBe('eligible-season-snapshot');
    expect(body.payouts.map((p: { playerId: string }) => p.playerId)).not.toContain('flagged-route-wallet');
  });
});

