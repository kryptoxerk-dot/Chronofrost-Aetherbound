import { describe, expect, it, beforeEach } from 'vitest';
import { payoutApprovals } from './payoutApproval.js';
import type { PayoutPlan } from './season.js';

const plan: PayoutPlan = {
  seasonId: 'season-test',
  prizePoolRaw: '1000000',
  fundedBy: 'studio-treasury',
  payoutSource: 'eligible-season-snapshot',
  payouts: [
    { rank: 1, playerId: 'wallet-a', playerName: 'A', rating: 1200, amountRaw: '500000' },
  ],
  note: 'test plan',
};

describe('payout approval workflow', () => {
  beforeEach(() => payoutApprovals._reset());

  it('creates pending requests and approves them before execution', () => {
    const request = payoutApprovals.create(plan, 'ops-a');
    expect(request.status).toBe('pending_review');

    const approved = payoutApprovals.approve(request.requestId, 'ops-b');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('ops-b');

    const executed = payoutApprovals.attachExecutionSignature(request.requestId, 'tx-test', 'ops-c');
    expect(executed.executionTxSignature).toBe('tx-test');
  });

  it('does not allow rejected requests to be approved or executed', () => {
    const request = payoutApprovals.create(plan, 'ops-a');
    const rejected = payoutApprovals.reject(request.requestId, 'ops-b', 'collusion review');
    expect(rejected.status).toBe('rejected');
    expect(() => payoutApprovals.approve(request.requestId, 'ops-c')).toThrow('payout request is rejected');
    expect(() => payoutApprovals.attachExecutionSignature(request.requestId, 'tx-test', 'ops-c')).toThrow('must be approved');
  });
});
