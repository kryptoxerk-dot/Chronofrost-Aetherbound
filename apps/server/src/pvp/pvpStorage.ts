import { env } from '../config/env.js';
import { createPvpRepositories } from './adapters/repositoryFactory.js';
import { payoutApprovals, type PayoutApprovalRepository } from './payoutApproval.js';
import { createPostgresPayoutApprovalRepository } from './adapters/postgresPayoutApproval.js';
import type { PvpRepositories } from './repositories.js';
import type { PgStorageHandle } from './adapters/pgClient.js';

/**
 * Composition root for PvP durable storage.
 *
 * Selects the in-memory or Postgres repository bundle from configuration and
 * owns the Postgres connection lifecycle. Routes/services should depend on
 * {@link getPvpStorage} so the storage backend can be swapped without touching
 * business logic. `pg` is dynamically imported only in postgres mode so the
 * default memory/dev path never loads the driver.
 */

export interface PvpStorageConfig {
  adapter?: 'memory' | 'postgres';
  databaseUrl?: string;
}

let repositories: PvpRepositories | null = null;
let payoutApprovalRepo: PayoutApprovalRepository | null = null;
let pgHandle: PgStorageHandle | null = null;

export async function initPvpStorage(config: PvpStorageConfig = {}): Promise<PvpRepositories> {
  if (repositories) return repositories;

  const adapter = config.adapter ?? env.PVP_STORAGE_ADAPTER;
  if (adapter === 'postgres') {
    const databaseUrl = config.databaseUrl ?? env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('PVP_STORAGE_ADAPTER=postgres requires DATABASE_URL to be set');
    }
    const { createPgSqlClient } = await import('./adapters/pgClient.js');
    pgHandle = createPgSqlClient(databaseUrl);
    // Fail fast on an unreachable / misconfigured database rather than at first
    // request time.
    await pgHandle.pool.query('SELECT 1');
    repositories = createPvpRepositories('postgres', pgHandle.client);
    payoutApprovalRepo = createPostgresPayoutApprovalRepository(pgHandle.client);
  } else {
    repositories = createPvpRepositories('memory');
    payoutApprovalRepo = payoutApprovals;
  }
  return repositories;
}

export function getPvpStorage(): PvpRepositories {
  if (!repositories) {
    throw new Error('PvP storage not initialized; call initPvpStorage() during server startup');
  }
  return repositories;
}

/**
 * Durable payout approval repository for the active storage adapter. Falls back
 * to the in-memory singleton before init so test harnesses that register routes
 * without calling initPvpStorage() keep working (prior always-available shape).
 */
export function getPayoutApprovals(): PayoutApprovalRepository {
  return payoutApprovalRepo ?? payoutApprovals;
}

/** Postgres handle (pool + migrate) when the postgres adapter is active, else null. */
export function getPgStorageHandle(): PgStorageHandle | null {
  return pgHandle;
}

export async function closePvpStorage(): Promise<void> {
  if (pgHandle) await pgHandle.end();
  pgHandle = null;
  repositories = null;
  payoutApprovalRepo = null;
}
