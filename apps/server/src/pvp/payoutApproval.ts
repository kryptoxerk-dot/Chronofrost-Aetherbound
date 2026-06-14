import crypto from 'node:crypto';
import type { PayoutPlan } from './season.js';

export type PayoutApprovalStatus = 'pending_review' | 'approved' | 'rejected' | 'cancelled';

export type PayoutApprovalRequest = {
  requestId: string;
  seasonId: string;
  status: PayoutApprovalStatus;
  payoutPlan: PayoutPlan;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  executionTxSignature?: string;
};

/**
 * Durable-friendly contract for the payout approval workflow.
 *
 * Approval is deliberately separate from planning (PayoutPlan generation) and
 * from execution (signed treasury transfer). This repository only records the
 * review lifecycle and the execution signature; it never moves funds. The
 * in-memory adapter backs local dev/tests; the Postgres adapter persists to
 * pvp_payout_plans so approvals survive restarts and double execution is
 * blocked by a unique execution_tx_signature.
 */
export interface PayoutApprovalRepository {
  create(payoutPlan: PayoutPlan, createdBy: string): Promise<PayoutApprovalRequest>;
  get(requestId: string): Promise<PayoutApprovalRequest | null>;
  list(seasonId?: string): Promise<PayoutApprovalRequest[]>;
  approve(requestId: string, approvedBy: string): Promise<PayoutApprovalRequest>;
  reject(requestId: string, rejectedBy: string, reason: string): Promise<PayoutApprovalRequest>;
  cancel(requestId: string, cancelledBy: string, reason: string): Promise<PayoutApprovalRequest>;
  attachExecutionSignature(requestId: string, txSignature: string, actor: string): Promise<PayoutApprovalRequest>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneRequest(request: PayoutApprovalRequest): PayoutApprovalRequest {
  return {
    ...request,
    payoutPlan: {
      ...request.payoutPlan,
      payouts: request.payoutPlan.payouts.map((p) => ({ ...p })),
    },
  };
}

function assertPending(request: PayoutApprovalRequest): void {
  if (request.status !== 'pending_review') throw new Error(`payout request is ${request.status}`);
}

export function createMemoryPayoutApprovalRepository(): PayoutApprovalRepository & { _reset(): void } {
  const requests = new Map<string, PayoutApprovalRequest>();

  return {
    async create(payoutPlan: PayoutPlan, createdBy: string): Promise<PayoutApprovalRequest> {
      if (payoutPlan.fundedBy !== 'studio-treasury') {
        throw new Error('only studio-funded payout plans can be submitted for approval');
      }
      const now = nowIso();
      const request: PayoutApprovalRequest = {
        requestId: crypto.randomUUID(),
        seasonId: payoutPlan.seasonId,
        status: 'pending_review',
        payoutPlan: {
          ...payoutPlan,
          payouts: payoutPlan.payouts.map((p) => ({ ...p })),
        },
        createdAt: now,
        createdBy,
        updatedAt: now,
      };
      requests.set(request.requestId, request);
      return cloneRequest(request);
    },

    async get(requestId: string): Promise<PayoutApprovalRequest | null> {
      const request = requests.get(requestId);
      return request ? cloneRequest(request) : null;
    },

    async list(seasonId?: string): Promise<PayoutApprovalRequest[]> {
      return [...requests.values()]
        .filter((request) => !seasonId || request.seasonId === seasonId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(cloneRequest);
    },

    async approve(requestId: string, approvedBy: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'approved';
      request.approvedAt = nowIso();
      request.approvedBy = approvedBy;
      request.updatedAt = request.approvedAt;
      return cloneRequest(request);
    },

    async reject(requestId: string, rejectedBy: string, reason: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'rejected';
      request.rejectedAt = nowIso();
      request.rejectedBy = rejectedBy;
      request.rejectionReason = reason;
      request.updatedAt = request.rejectedAt;
      return cloneRequest(request);
    },

    async cancel(requestId: string, cancelledBy: string, reason: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      assertPending(request);
      request.status = 'cancelled';
      request.cancelledAt = nowIso();
      request.cancelledBy = cancelledBy;
      request.cancellationReason = reason;
      request.updatedAt = request.cancelledAt;
      return cloneRequest(request);
    },

    async attachExecutionSignature(requestId: string, txSignature: string, actor: string): Promise<PayoutApprovalRequest> {
      const request = requests.get(requestId);
      if (!request) throw new Error('payout request not found');
      if (request.status !== 'approved') throw new Error('payout request must be approved before execution');
      if (request.executionTxSignature) throw new Error('payout request already has execution signature');
      request.executionTxSignature = txSignature;
      request.updatedAt = nowIso();
      // actor retained for audit; the Postgres adapter records it durably.
      void actor;
      return cloneRequest(request);
    },

    _reset(): void {
      requests.clear();
    },
  };
}

/**
 * Process-wide in-memory payout approvals (local dev/tests + memory storage
 * mode). In postgres storage mode, routes use the durable adapter via
 * pvpStorage instead. Exposed directly so unit tests can drive it.
 */
export const payoutApprovals = createMemoryPayoutApprovalRepository();
