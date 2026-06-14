import type { PayoutApprovalRequest } from './payoutApproval.js';

export type TreasuryPayoutPreflightResult = {
  ok: true;
  requestId: string;
  seasonId: string;
  recipientCount: number;
  totalAmountRaw: string;
};

export function validateTreasuryPayoutPreflight(request: PayoutApprovalRequest): TreasuryPayoutPreflightResult {
  if (request.status !== 'approved') throw new Error('payout request must be approved before treasury execution');
  if (request.executionTxSignature) throw new Error('payout request already executed');
  if (request.payoutPlan.fundedBy !== 'studio-treasury') throw new Error('payout plan must be studio-funded');

  const seen = new Set<string>();
  let total = 0n;
  for (const payout of request.payoutPlan.payouts) {
    if (!payout.playerId.trim()) throw new Error('payout playerId required');
    if (seen.has(payout.playerId)) throw new Error(`duplicate payout recipient: ${payout.playerId}`);
    seen.add(payout.playerId);
    if (!/^\d+$/.test(payout.amountRaw)) throw new Error(`invalid amountRaw for ${payout.playerId}`);
    const amount = BigInt(payout.amountRaw);
    if (amount <= 0n) throw new Error(`non-positive payout for ${payout.playerId}`);
    total += amount;
  }

  if (total > BigInt(request.payoutPlan.prizePoolRaw)) {
    throw new Error('payout total exceeds configured prize pool');
  }

  return {
    ok: true,
    requestId: request.requestId,
    seasonId: request.seasonId,
    recipientCount: request.payoutPlan.payouts.length,
    totalAmountRaw: total.toString(),
  };
}
