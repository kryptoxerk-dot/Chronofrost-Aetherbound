import { createMemoryPvpRepositories } from './memoryRepositories.js';
import { createPostgresPvpRepositories, type SqlClient } from './postgresRepositories.js';
import type { PvpRepositories } from '../repositories.js';

export type PvpRepositoryMode = 'memory' | 'postgres';

/**
 * Build the PvP repository bundle for the configured storage adapter.
 *
 * The postgres adapter is dependency-injected with a {@link SqlClient} (e.g. a
 * node-postgres Pool) so this module stays driver-agnostic and unit-testable.
 * Routes continue to use the in-memory ladder/eligibility singletons directly;
 * this factory is the seam new repository-backed code depends on.
 */
export function createPvpRepositories(mode: PvpRepositoryMode = 'memory', client?: SqlClient): PvpRepositories {
  if (mode === 'memory') return createMemoryPvpRepositories();
  if (!client) {
    throw new Error('PVP_STORAGE_ADAPTER=postgres requires a SqlClient (e.g. a node-postgres Pool)');
  }
  return createPostgresPvpRepositories(client);
}
