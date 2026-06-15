import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import type { SqlClient } from './postgresRepositories.js';

const { Pool } = pg;

const SCHEMA_RELATIVE = 'resources/pvp_database_schema.sql';

/**
 * Resolve the PvP schema across layouts: repo root (cwd), and source/dist
 * relative (apps/server/{src,dist}/pvp/adapters -> repo root). Robust to both
 * native (cwd = repo root) and container (cwd = /app) deployments.
 */
function resolveSchemaPath(): string {
  const candidates = [
    path.resolve(process.cwd(), SCHEMA_RELATIVE),
    fileURLToPath(new URL(`../../../../../${SCHEMA_RELATIVE}`, import.meta.url)),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export interface PgStorageHandle {
  /** Driver-agnostic client passed to createPostgresPvpRepositories. */
  client: SqlClient;
  /** Underlying node-postgres pool, for migrations / health checks. */
  pool: pg.Pool;
  /** Apply resources/pvp_database_schema.sql (idempotent; CREATE ... IF NOT EXISTS). */
  migrate(): Promise<void>;
  /** Close the pool. */
  end(): Promise<void>;
}

/**
 * Adapt a node-postgres Pool to the minimal {@link SqlClient} seam the PvP
 * Postgres repositories depend on. Keeping this wrapper thin (and the repos
 * driver-agnostic) means the repository logic stays unit-testable without a
 * live database.
 */
export function createPgSqlClient(connectionString: string): PgStorageHandle {
  const pool = new Pool({ connectionString });

  const client: SqlClient = {
    async query(sql, params) {
      const result = await pool.query(sql, params as unknown[] | undefined);
      return { rows: result.rows };
    },
    async connect() {
      const conn = await pool.connect();
      return {
        async query(sql, params) {
          const result = await conn.query(sql, params as unknown[] | undefined);
          return { rows: result.rows };
        },
        release() {
          conn.release();
        },
      };
    },
  };

  return {
    client,
    pool,
    async migrate() {
      const sql = await readFile(resolveSchemaPath(), 'utf8');
      await pool.query(sql);
    },
    async end() {
      await pool.end();
    },
  };
}
