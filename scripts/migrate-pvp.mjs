#!/usr/bin/env node
// Apply the Postgres schema used by PvP and the cosmetic shop
// (resources/pvp_database_schema.sql).
//
// Usage:
//   DATABASE_URL=postgres://user:pass@host:5432/db node scripts/migrate-pvp.mjs
//
// The schema uses CREATE ... IF NOT EXISTS throughout, so this is idempotent and
// safe to re-run. It does NOT move funds or touch player tokens.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('migrate-pvp: DATABASE_URL is required');
  process.exit(1);
}

const schemaPath = fileURLToPath(new URL('../resources/pvp_database_schema.sql', import.meta.url));

let Pool;
try {
  ({ Pool } = (await import('pg')).default);
} catch {
  console.error('migrate-pvp: the "pg" package is required. Run: pnpm --filter @chronofrost/server add pg');
  process.exit(1);
}

const sql = await readFile(schemaPath, 'utf8');
const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(sql);
  console.log('migrate-pvp: schema applied successfully');
} catch (error) {
  console.error('migrate-pvp: failed to apply schema');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
