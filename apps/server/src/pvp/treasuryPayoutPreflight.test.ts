import { describe, expect, it } from 'vitest';
import type { PayoutApprovalRequest } from './payoutApproval.js';
import { validateTreasuryPayoutPreflight } from './treasuryPayoutPreflight.js';

function approvedRequest(overrides: Partial<PayoutApprovalRequest> = {}): PayoutApprovalRequest {
  return {
    requestId: 'request-1',
    seasonId: 'season-1',
    status: 'approved',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'ops-a',
    updatedAt: '2026-01-01T00:00:00.000Z',
    approvedAt: '2026-01-01T00:01:00.000Z',
    approvedBy: 'ops-b',
    payoutPlan: {
      seasonId: 'season-1',
      prizePoolRaw: '1000',
      fundedBy: 'studio-treasury',
      payoutSource: 'eligible-season-snapshot',
      note: 'test',
      payouts: [
        { rank: 1, playerId: 'wallet-a', playerName: 'A', rating: 1200, amountRaw: '500' },
        { rank: 2, playerId: 'wallet-b', playerName: 'B', rating: 1100, amountRaw: '300' },
      ],
    },
    ...overrides,
  };
}

describe('treasury payout preflight', () => {
  it('accepts approved studio-funded payout requests within configured pool', () => {
    expect(validateTreasuryPayoutPreflight(approvedRequest())).toMatchObject({
      ok: true,
      recipientCount: 2,
      totalAmountRaw: '800',
    });
  });

  it('rejects unapproved or already executed requests', () => {
    expect(() => validateTreasuryPayoutPreflight(approvedRequest({ status: 'pending_review' }))).toThrow('approved');
    expect(() => validateTreasuryPayoutPreflight(approvedRequest({ executionTxSignature: 'tx' }))).toThrow('already executed');
  });

  it('rejects duplicate recipients and over-budget plans', () => {
    const duplicate = approvedRequest();
    duplicate.payoutPlan.payouts[1]!.playerId = 'wallet-a';
    expect(() => validateTreasuryPayoutPreflight(duplicate)).toThrow('duplicate');

    const overBudget = approvedRequest();
    overBudget.payoutPlan.payouts[0]!.amountRaw = '900';
    overBudget.payoutPlan.payouts[1]!.amountRaw = '900';
    expect(() => validateTreasuryPayoutPreflight(overBudget)).toThrow('exceeds');
  });
});
