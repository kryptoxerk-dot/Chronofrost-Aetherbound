import { describe, it, expect, beforeEach } from 'vitest';
import { createPostgresPayoutApprovalRepository } from './postgresPayoutApproval.js';
import type { SqlClient, SqlQueryResult } from './postgresRepositories.js';
import type { PayoutPlan } from '../season.js';

const plan: PayoutPlan = {
  seasonId: 'season-test',
  prizePoolRaw: '1000000',
  fundedBy: 'studio-treasury',
  payoutSource: 'eligible-season-snapshot',
  payouts: [{ rank: 1, playerId: 'wallet-a', playerName: 'A', rating: 1200, amountRaw: '500000' }],
  note: 'test plan',
};

/** Focused in-memory emulation of pvp_payout_plans for the approval adapter. */
class FakePayoutDb implements SqlClient {
  rows = new Map<string, Record<string, unknown>>();
  private tick = 1_700_000_000_000;
  private now(): string {
    this.tick += 1;
    return new Date(this.tick).toISOString();
  }

  async query<T = unknown>(raw: string, params: readonly unknown[] = []): Promise<SqlQueryResult<T>> {
    const sql = raw.replace(/\s+/g, ' ').trim();

    if (sql.startsWith('INSERT INTO pvp_payout_plans')) {
      const [planId, seasonId, createdBy, prizePoolRaw, planJson] = params as [string, string, string, string, string];
      const row: Record<string, unknown> = {
        plan_id: planId,
        season_id: seasonId,
        created_by_admin: createdBy,
        prize_pool_raw: prizePoolRaw,
        plan_json: JSON.parse(planJson),
        status: 'pending_review',
        created_at: this.now(),
        approved_by_admin: null,
        approved_at: null,
        rejected_by_admin: null,
        rejected_at: null,
        rejection_reason: null,
        cancelled_by_admin: null,
        cancelled_at: null,
        cancellation_reason: null,
        execution_tx_signature: null,
      };
      this.rows.set(planId, row);
      return { rows: [{ ...row }] as T[] };
    }

    if (sql.startsWith('SELECT') && sql.includes('WHERE plan_id = $1')) {
      const row = this.rows.get(params[0] as string);
      return { rows: (row ? [{ ...row }] : []) as T[] };
    }

    if (sql.startsWith('SELECT') && sql.includes('ORDER BY created_at DESC')) {
      let list = [...this.rows.values()];
      if (sql.includes('WHERE season_id = $1')) list = list.filter((r) => r.season_id === params[0]);
      list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { rows: list.map((r) => ({ ...r })) as T[] };
    }

    if (sql.startsWith('UPDATE pvp_payout_plans SET execution_tx_signature')) {
      const row = this.rows.get(params[0] as string);
      if (row && row.status === 'approved' && row.execution_tx_signature === null) {
        for (const other of this.rows.values()) {
          if (other.execution_tx_signature === params[1]) {
            throw new Error('duplicate key value violates unique constraint "pvp_payout_plans_execution_tx_signature_key"');
          }
        }
        row.execution_tx_signature = params[1];
        return { rows: [{ ...row }] as T[] };
      }
      return { rows: [] as T[] };
    }

    if (sql.startsWith('UPDATE pvp_payout_plans SET status')) {
      const whereClause = sql.split('WHERE')[1] ?? '';
      const expectedFrom = /status = '(\w+)'/.exec(whereClause)?.[1];
      const row = this.rows.get(params[0] as string);
      if (row && row.status === expectedFrom) {
        if (sql.includes("status = 'approved'")) {
          row.status = 'approved';
          row.approved_by_admin = params[1];
          row.approved_at = this.now();
        } else if (sql.includes("status = 'rejected'")) {
          row.status = 'rejected';
          row.rejected_by_admin = params[1];
          row.rejected_at = this.now();
          row.rejection_reason = params[2];
        } else if (sql.includes("status = 'cancelled'")) {
          row.status = 'cancelled';
          row.cancelled_by_admin = params[1];
          row.cancelled_at = this.now();
          row.cancellation_reason = params[2];
        }
        return { rows: [{ ...row }] as T[] };
      }
      return { rows: [] as T[] };
    }

    throw new Error(`FakePayoutDb: unhandled SQL: ${sql}`);
  }
}

describe('postgres payout approval repository', () => {
  let db: FakePayoutDb;
  let repo: ReturnType<typeof createPostgresPayoutApprovalRepository>;

  beforeEach(() => {
    db = new FakePayoutDb();
    repo = createPostgresPayoutApprovalRepository(db);
  });

  it('creates a pending request, approves it, then records execution', async () => {
    const created = await repo.create(plan, 'ops-a');
    expect(created).toMatchObject({ status: 'pending_review', seasonId: 'season-test', createdBy: 'ops-a' });
    expect(created.payoutPlan.payouts[0].amountRaw).toBe('500000');

    const approved = await repo.approve(created.requestId, 'ops-b');
    expect(approved).toMatchObject({ status: 'approved', approvedBy: 'ops-b' });
    expect(approved.approvedAt).toBeTruthy();

    const executed = await repo.attachExecutionSignature(created.requestId, 'tx-1', 'ops-c');
    expect(executed.executionTxSignature).toBe('tx-1');

    const fetched = await repo.get(created.requestId);
    expect(fetched?.executionTxSignature).toBe('tx-1');
  });

  it('rejects plans not funded by the studio treasury', async () => {
    const bad = { ...plan, fundedBy: 'external-source' } as unknown as PayoutPlan;
    await expect(repo.create(bad, 'ops-a')).rejects.toThrow('studio-funded');
  });

  it('does not allow a rejected request to be approved or executed', async () => {
    const created = await repo.create(plan, 'ops-a');
    const rejected = await repo.reject(created.requestId, 'ops-b', 'collusion review');
    expect(rejected).toMatchObject({ status: 'rejected', rejectedBy: 'ops-b', rejectionReason: 'collusion review' });
    await expect(repo.approve(created.requestId, 'ops-c')).rejects.toThrow('payout request is rejected');
    await expect(repo.attachExecutionSignature(created.requestId, 'tx-1', 'ops-c')).rejects.toThrow('must be approved');
  });

  it('blocks double execution on the same request', async () => {
    const created = await repo.create(plan, 'ops-a');
    await repo.approve(created.requestId, 'ops-b');
    await repo.attachExecutionSignature(created.requestId, 'tx-1', 'ops-c');
    await expect(repo.attachExecutionSignature(created.requestId, 'tx-2', 'ops-c')).rejects.toThrow('already has execution signature');
  });

  it('cancels a pending request and lists by season (newest first)', async () => {
    const a = await repo.create(plan, 'ops-a');
    const b = await repo.create({ ...plan, seasonId: 'season-test' }, 'ops-a');
    await repo.cancel(a.requestId, 'ops-b', 'superseded');

    const list = await repo.list('season-test');
    expect(list).toHaveLength(2);
    expect(list[0].requestId).toBe(b.requestId); // newest first
    const cancelled = await repo.get(a.requestId);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancellationReason: 'superseded' });
  });

  it('returns null for an unknown request', async () => {
    expect(await repo.get('nope')).toBeNull();
  });
});
