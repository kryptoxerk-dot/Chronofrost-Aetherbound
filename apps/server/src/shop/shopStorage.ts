import { env } from '../config/env.js';
import type { PgStorageHandle } from '../pvp/adapters/pgClient.js';
import type { SqlClient } from '../pvp/adapters/postgresRepositories.js';
import { createMemoryShopRepository } from './adapters/memoryShopRepository.js';
import { createPostgresShopRepository } from './adapters/postgresShopRepository.js';
import type { ShopRepository } from './repositories.js';

export interface ShopStorageConfig {
  adapter?: 'memory' | 'postgres';
  databaseUrl?: string;
  client?: SqlClient;
}

let repository: ShopRepository | null = null;
let ownedPgHandle: PgStorageHandle | null = null;

export async function initShopStorage(config: ShopStorageConfig = {}): Promise<ShopRepository> {
  if (repository) return repository;

  const adapter = config.adapter ?? env.SHOP_STORAGE_ADAPTER;
  if (adapter === 'postgres') {
    const client = config.client;
    if (client) {
      repository = createPostgresShopRepository(client);
      return repository;
    }

    const databaseUrl = config.databaseUrl ?? env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('SHOP_STORAGE_ADAPTER=postgres requires DATABASE_URL to be set');
    }
    const { createPgSqlClient } = await import('../pvp/adapters/pgClient.js');
    ownedPgHandle = createPgSqlClient(databaseUrl);
    await ownedPgHandle.pool.query('SELECT 1');
    repository = createPostgresShopRepository(ownedPgHandle.client);
    return repository;
  }

  repository = createMemoryShopRepository();
  return repository;
}

export function getShopStorage(): ShopRepository {
  return repository ?? createMemoryShopRepository();
}

export async function closeShopStorage(): Promise<void> {
  if (ownedPgHandle) await ownedPgHandle.end();
  ownedPgHandle = null;
  repository = null;
}
