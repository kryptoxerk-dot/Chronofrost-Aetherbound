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

const requests = new Map<string, PayoutApprovalRequest>();

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

export const payoutApprovals = {
  create(payoutPlan: PayoutPlan, createdBy: string): PayoutApprovalRequest {
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

  get(requestId: string): PayoutApprovalRequest | null {
    const request = requests.get(requestId);
    return request ? cloneRequest(request) : null;
  },

  list(seasonId?: string): PayoutApprovalRequest[] {
    return [...requests.values()]
      .filter((request) => !seasonId || request.seasonId === seasonId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(cloneRequest);
  },

  approve(requestId: string, approvedBy: string): PayoutApprovalRequest {
    const request = requests.get(requestId);
    if (!request) throw new Error('payout request not found');
    assertPending(request);
    request.status = 'approved';
    request.approvedAt = nowIso();
    request.approvedBy = approvedBy;
    request.updatedAt = request.approvedAt;
    return cloneRequest(request);
  },

  reject(requestId: string, rejectedBy: string, reason: string): PayoutApprovalRequest {
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

  cancel(requestId: string, cancelledBy: string, reason: string): PayoutApprovalRequest {
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

  attachExecutionSignature(requestId: string, txSignature: string, actor: string): PayoutApprovalRequest {
    const request = requests.get(requestId);
    if (!request) throw new Error('payout request not found');
    if (request.status !== 'approved') throw new Error('payout request must be approved before execution');
    if (request.executionTxSignature) throw new Error('payout request already has execution signature');
    request.executionTxSignature = txSignature;
    request.updatedAt = nowIso();
    // actor is retained for future durable audit adapters. In-memory shape keeps
    // the request compact while docs/schema define the durable transaction table.
    void actor;
    return cloneRequest(request);
  },

  _reset(): void {
    requests.clear();
  },
};
