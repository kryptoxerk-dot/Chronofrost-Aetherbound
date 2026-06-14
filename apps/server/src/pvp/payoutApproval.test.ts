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

  it('creates pending requests and approves them before execution', async () => {
    const request = await payoutApprovals.create(plan, 'ops-a');
    expect(request.status).toBe('pending_review');

    const approved = await payoutApprovals.approve(request.requestId, 'ops-b');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('ops-b');

    const executed = await payoutApprovals.attachExecutionSignature(request.requestId, 'tx-test', 'ops-c');
    expect(executed.executionTxSignature).toBe('tx-test');
  });

  it('does not allow rejected requests to be approved or executed', async () => {
    const request = await payoutApprovals.create(plan, 'ops-a');
    const rejected = await payoutApprovals.reject(request.requestId, 'ops-b', 'collusion review');
    expect(rejected.status).toBe('rejected');
    await expect(payoutApprovals.approve(request.requestId, 'ops-c')).rejects.toThrow('payout request is rejected');
    await expect(payoutApprovals.attachExecutionSignature(request.requestId, 'tx-test', 'ops-c')).rejects.toThrow('must be approved');
  });

  it('blocks double execution on an approved request', async () => {
    const request = await payoutApprovals.create(plan, 'ops-a');
    await payoutApprovals.approve(request.requestId, 'ops-b');
    await payoutApprovals.attachExecutionSignature(request.requestId, 'tx-1', 'ops-c');
    await expect(payoutApprovals.attachExecutionSignature(request.requestId, 'tx-2', 'ops-c')).rejects.toThrow('already has execution signature');
  });
});
