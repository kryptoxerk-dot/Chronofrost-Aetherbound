import crypto from 'node:crypto';
import type { SqlClient } from './postgresRepositories.js';
import type {
  PayoutApprovalRepository,
  PayoutApprovalRequest,
  PayoutApprovalStatus,
} from '../payoutApproval.js';
import type { PayoutPlan } from '../season.js';

/**
 * Durable payout approval workflow backed by pvp_payout_plans.
 *
 * Status transitions are atomic conditional UPDATEs (`WHERE status =
 * 'pending_review'`), so concurrent admins cannot double-approve. Execution
 * recording is gated on `status = 'approved' AND execution_tx_signature IS
 * NULL`, and the column's UNIQUE constraint blocks reusing a signature across
 * requests. This module records the review lifecycle only — it never signs or
 * sends a treasury transfer.
 *
 * Note: pvp_payout_plans.season_id references pvp_seasons; the season row must
 * exist before a plan is submitted in a live database.
 */

interface PayoutPlanRow {
  plan_id: string;
  season_id: string;
  created_by_admin: string;
  plan_json: PayoutPlan | string;
  status: string;
  created_at: unknown;
  approved_by_admin: string | null;
  approved_at: unknown;
  rejected_by_admin: string | null;
  rejected_at: unknown;
  rejection_reason: string | null;
  cancelled_by_admin: string | null;
  cancelled_at: unknown;
  cancellation_reason: string | null;
  execution_tx_signature: string | null;
}

function toIso(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function maxIso(...values: string[]): string {
  return values.filter(Boolean).sort().at(-1) ?? '';
}

function rowToRequest(row: PayoutPlanRow): PayoutApprovalRequest {
  const createdAt = toIso(row.created_at);
  const approvedAt = toIso(row.approved_at);
  const rejectedAt = toIso(row.rejected_at);
  const cancelledAt = toIso(row.cancelled_at);
  const plan = typeof row.plan_json === 'string' ? (JSON.parse(row.plan_json) as PayoutPlan) : row.plan_json;

  const request: PayoutApprovalRequest = {
    requestId: row.plan_id,
    seasonId: row.season_id,
    status: row.status as PayoutApprovalStatus,
    payoutPlan: plan,
    createdAt,
    createdBy: row.created_by_admin,
    updatedAt: maxIso(createdAt, approvedAt, rejectedAt, cancelledAt) || createdAt,
  };
  if (row.approved_at) request.approvedAt = approvedAt;
  if (row.approved_by_admin) request.approvedBy = row.approved_by_admin;
  if (row.rejected_at) request.rejectedAt = rejectedAt;
  if (row.rejected_by_admin) request.rejectedBy = row.rejected_by_admin;
  if (row.rejection_reason) request.rejectionReason = row.rejection_reason;
  if (row.cancelled_at) request.cancelledAt = cancelledAt;
  if (row.cancelled_by_admin) request.cancelledBy = row.cancelled_by_admin;
  if (row.cancellation_reason) request.cancellationReason = row.cancellation_reason;
  if (row.execution_tx_signature) request.executionTxSignature = row.execution_tx_signature;
  return request;
}

const SELECT_COLUMNS =
  'plan_id, season_id, created_by_admin, plan_json, status, created_at, ' +
  'approved_by_admin, approved_at, rejected_by_admin, rejected_at, rejection_reason, ' +
  'cancelled_by_admin, cancelled_at, cancellation_reason, execution_tx_signature';

export function createPostgresPayoutApprovalRepository(client: SqlClient): PayoutApprovalRepository {
  async function fetch(requestId: string): Promise<PayoutApprovalRequest | null> {
    const res = await client.query<PayoutPlanRow>(
      `SELECT ${SELECT_COLUMNS} FROM pvp_payout_plans WHERE plan_id = $1`,
      [requestId],
    );
    return res.rows[0] ? rowToRequest(res.rows[0]) : null;
  }

  /** Run a conditional transition; throw a precise error if it did not apply. */
  async function transition(
    requestId: string,
    setClause: string,
    params: readonly unknown[],
    expectedFrom: PayoutApprovalStatus,
  ): Promise<PayoutApprovalRequest> {
    const res = await client.query<PayoutPlanRow>(
      `UPDATE pvp_payout_plans SET ${setClause}
         WHERE plan_id = $1 AND status = '${expectedFrom}'
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );
    if (res.rows[0]) return rowToRequest(res.rows[0]);
    const current = await fetch(requestId);
    if (!current) throw new Error('payout request not found');
    throw new Error(`payout request is ${current.status}`);
  }

  return {
    async create(payoutPlan: PayoutPlan, createdBy: string): Promise<PayoutApprovalRequest> {
      if (payoutPlan.fundedBy !== 'studio-treasury') {
        throw new Error('only studio-funded payout plans can be submitted for approval');
      }
      const res = await client.query<PayoutPlanRow>(
        `INSERT INTO pvp_payout_plans (plan_id, season_id, created_by_admin, prize_pool_raw, plan_json, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'pending_review', now())
         RETURNING ${SELECT_COLUMNS}`,
        [crypto.randomUUID(), payoutPlan.seasonId, createdBy, payoutPlan.prizePoolRaw, JSON.stringify(payoutPlan)],
      );
      return rowToRequest(res.rows[0]);
    },

    get(requestId: string): Promise<PayoutApprovalRequest | null> {
      return fetch(requestId);
    },

    async list(seasonId?: string): Promise<PayoutApprovalRequest[]> {
      const res = seasonId
        ? await client.query<PayoutPlanRow>(
            `SELECT ${SELECT_COLUMNS} FROM pvp_payout_plans WHERE season_id = $1 ORDER BY created_at DESC`,
            [seasonId],
          )
        : await client.query<PayoutPlanRow>(
            `SELECT ${SELECT_COLUMNS} FROM pvp_payout_plans ORDER BY created_at DESC`,
          );
      return res.rows.map(rowToRequest);
    },

    approve(requestId: string, approvedBy: string): Promise<PayoutApprovalRequest> {
      return transition(
        requestId,
        `status = 'approved', approved_by_admin = $2, approved_at = now()`,
        [requestId, approvedBy],
        'pending_review',
      );
    },

    reject(requestId: string, rejectedBy: string, reason: string): Promise<PayoutApprovalRequest> {
      return transition(
        requestId,
        `status = 'rejected', rejected_by_admin = $2, rejected_at = now(), rejection_reason = $3`,
        [requestId, rejectedBy, reason],
        'pending_review',
      );
    },

    cancel(requestId: string, cancelledBy: string, reason: string): Promise<PayoutApprovalRequest> {
      return transition(
        requestId,
        `status = 'cancelled', cancelled_by_admin = $2, cancelled_at = now(), cancellation_reason = $3`,
        [requestId, cancelledBy, reason],
        'pending_review',
      );
    },

    async attachExecutionSignature(requestId: string, txSignature: string, actor: string): Promise<PayoutApprovalRequest> {
      void actor; // captured by approved_by_admin / audit; recorded durably elsewhere
      const res = await client.query<PayoutPlanRow>(
        `UPDATE pvp_payout_plans SET execution_tx_signature = $2
           WHERE plan_id = $1 AND status = 'approved' AND execution_tx_signature IS NULL
         RETURNING ${SELECT_COLUMNS}`,
        [requestId, txSignature],
      );
      if (res.rows[0]) return rowToRequest(res.rows[0]);
      const current = await fetch(requestId);
      if (!current) throw new Error('payout request not found');
      if (current.status !== 'approved') throw new Error('payout request must be approved before execution');
      throw new Error('payout request already has execution signature');
    },
  };
}
