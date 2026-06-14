import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { SqlClient } from './postgresRepositories.js';

const { Pool } = pg;

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
      const schemaPath = fileURLToPath(new URL('../../../../../resources/pvp_database_schema.sql', import.meta.url));
      const sql = await readFile(schemaPath, 'utf8');
      await pool.query(sql);
    },
    async end() {
      await pool.end();
    },
  };
}
