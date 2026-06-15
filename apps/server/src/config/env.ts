import { z } from 'zod';
import type { EligibilityRules } from '../pvp/eligibility.js';

const EnvBool = z.preprocess((value: unknown) => {
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  return value;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SERVER_PORT: z.coerce.number().default(8787),
  // Many PaaS hosts (Render/Railway/Fly/Heroku) inject the bind port as PORT.
  // When present it takes precedence over SERVER_PORT (see resolveServerPort).
  PORT: z.coerce.number().int().positive().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_CLUSTER: z.string().default('devnet'),
  AETHER_MINT: z.string().default(''),
  TREASURY_WALLET: z.string().default(''),
  TREASURY_TOKEN_ACCOUNT: z.string().default(''),
  SESSION_SECRET: z.string().default('dev-only-change-me'),

  // Postgres connection string. Required only when PVP_STORAGE_ADAPTER=postgres.
  DATABASE_URL: z.string().default(''),

  // PvP season prize planning. These values are server/admin controlled; public
  // callers must never be allowed to submit prizePoolRaw or distribution.
  PVP_ADMIN_TOKEN: z.string().default(''),
  PVP_SEASON_ID: z.string().default('season-0-dev'),
  PVP_PRIZE_POOL_RAW: z.string().regex(/^\d+$/).default('0'),
  PVP_PRIZE_DISTRIBUTION: z.string().default('0.5,0.3,0.2'),
  PVP_TOKEN_DECIMALS: z.coerce.number().int().min(0).max(18).default(6),

  // PvP prize eligibility / anti-sybil rules. Defaults are conservative for a
  // real season; tests can pass explicit relaxed rules.
  PVP_SEASON_CUTOFF_AT: z.string().default('9999-12-31T00:00:00.000Z'),
  PVP_MIN_ACCOUNT_AGE_DAYS: z.coerce.number().min(0).default(7),
  PVP_MIN_COMPLETED_MATCHES: z.coerce.number().int().min(0).default(30),
  PVP_MIN_UNIQUE_OPPONENTS: z.coerce.number().int().min(0).default(10),
  PVP_MAX_COUNTED_MATCHES_PER_OPPONENT: z.coerce.number().int().min(1).default(3),
  PVP_MAX_FORFEIT_RATE: z.coerce.number().min(0).max(1).default(0.2),
  PVP_SHORT_MATCH_MAX_ACTIONS: z.coerce.number().int().min(0).default(3),
  PVP_MAX_SHORT_MATCH_RATE: z.coerce.number().min(0).max(1).default(0.35),
  PVP_MAX_IDENTITY_CLUSTER_SIZE: z.coerce.number().int().min(1).default(3),
  PVP_FINGERPRINTING_ENABLED: EnvBool.default(false),
  PVP_FINGERPRINT_SALT: z.string().default(''),
  PVP_TEST_WALLET_PREFIXES: z.string().default('test-,dev-,wallet-route-'),
  PVP_ADMIN_EXCLUDED_WALLETS: z.string().default(''),
  PVP_STORAGE_ADAPTER: z.enum(['memory', 'postgres']).default('memory'),
  SHOP_STORAGE_ADAPTER: z.enum(['memory', 'postgres']).default('memory'),
  SHOP_PURCHASES_ENABLED: EnvBool.default(true),


  // Dependency-free fixed-window limits for abuse-sensitive PvP/admin routes.
  // These are not a replacement for edge/WAF limits, but they make local and
  // small deployments safer by default.
  PVP_QUEUE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(12),
  PVP_QUEUE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  PVP_ACTION_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),
  PVP_ACTION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  PVP_ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),
  PVP_ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  AUTH_NONCE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  AUTH_NONCE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  AUTH_VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  AUTH_VERIFY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
});

export const env = EnvSchema.parse(process.env);

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

const DEV_SESSION_SECRET = 'dev-only-change-me';

/**
 * Fail fast at boot on unsafe production configuration. Returns the problems it
 * found (empty in non-production or when valid) so it is also unit-testable.
 */
type ProdCheckEnv = Pick<typeof env, 'NODE_ENV' | 'SESSION_SECRET' | 'PVP_STORAGE_ADAPTER' | 'DATABASE_URL'>;

export function productionConfigProblems(e: ProdCheckEnv = env): string[] {
  if (e.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  if (!e.SESSION_SECRET || e.SESSION_SECRET === DEV_SESSION_SECRET) {
    problems.push('SESSION_SECRET must be set to a strong random value in production');
  } else if (e.SESSION_SECRET.length < 16) {
    problems.push('SESSION_SECRET must be at least 16 characters in production');
  }
  if (e.PVP_STORAGE_ADAPTER === 'postgres' && !e.DATABASE_URL) {
    problems.push('DATABASE_URL is required when PVP_STORAGE_ADAPTER=postgres');
  }
  return problems;
}

/** Throws a single combined error if production configuration is unsafe. */
export function assertProductionConfig(): void {
  const problems = productionConfigProblems();
  if (problems.length > 0) {
    throw new Error(`Unsafe production configuration:\n- ${problems.join('\n- ')}`);
  }
}

/** Bind port: prefer the host-injected PORT, else SERVER_PORT. */
export function resolveServerPort(): number {
  return env.PORT ?? env.SERVER_PORT;
}

/**
 * CORS allowed origin. Accepts a bare host (e.g. a PaaS service binding) and
 * assumes https so cross-service wiring works without a manual scheme.
 */
export function resolveCorsOrigin(): string {
  const value = env.CORS_ORIGIN.trim();
  if (!value) return 'http://localhost:5173';
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

export function requireConfiguredSolana() {
  const missing = [
    ['AETHER_MINT', env.AETHER_MINT],
    ['TREASURY_WALLET', env.TREASURY_WALLET],
    ['TREASURY_TOKEN_ACCOUNT', env.TREASURY_TOKEN_ACCOUNT],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing Solana config: ${missing.map(([key]) => key).join(', ')}`);
  }
}

export function requirePvpAdminToken(): string {
  if (!env.PVP_ADMIN_TOKEN) {
    throw new Error('Missing PVP_ADMIN_TOKEN');
  }
  return env.PVP_ADMIN_TOKEN;
}

export function getPvpSeasonConfig() {
  const distribution = env.PVP_PRIZE_DISTRIBUTION.split(',')
    .map((part: string) => Number(part.trim()))
    .filter((value: number) => Number.isFinite(value) && value > 0);

  if (distribution.length === 0) throw new Error('PVP_PRIZE_DISTRIBUTION must contain positive shares');

  return {
    seasonId: env.PVP_SEASON_ID,
    distribution,
    prizePoolRaw: env.PVP_PRIZE_POOL_RAW,
    decimals: env.PVP_TOKEN_DECIMALS,
    fundedByStudio: true as const,
  };
}


function splitCsv(value: string): string[] {
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

export function getPvpEligibilityRules(): EligibilityRules {
  return {
    seasonId: env.PVP_SEASON_ID,
    seasonCutoffAt: env.PVP_SEASON_CUTOFF_AT,
    minAccountAgeDays: env.PVP_MIN_ACCOUNT_AGE_DAYS,
    minCompletedMatches: env.PVP_MIN_COMPLETED_MATCHES,
    minUniqueOpponents: env.PVP_MIN_UNIQUE_OPPONENTS,
    maxCountedMatchesPerOpponent: env.PVP_MAX_COUNTED_MATCHES_PER_OPPONENT,
    maxForfeitRate: env.PVP_MAX_FORFEIT_RATE,
    shortMatchMaxActions: env.PVP_SHORT_MATCH_MAX_ACTIONS,
    maxShortMatchRate: env.PVP_MAX_SHORT_MATCH_RATE,
    maxIdentityClusterSize: env.PVP_MAX_IDENTITY_CLUSTER_SIZE,
    fingerprintingEnabled: env.PVP_FINGERPRINTING_ENABLED,
    fingerprintSalt: env.PVP_FINGERPRINT_SALT || env.SESSION_SECRET,
    testWalletPrefixes: splitCsv(env.PVP_TEST_WALLET_PREFIXES),
    adminExcludedWallets: splitCsv(env.PVP_ADMIN_EXCLUDED_WALLETS),
  };
}


export function getPvpRateLimitConfig() {
  return {
    queue: {
      name: 'pvp.queue',
      limit: env.PVP_QUEUE_RATE_LIMIT_MAX,
      windowMs: env.PVP_QUEUE_RATE_LIMIT_WINDOW_MS,
    },
    action: {
      name: 'pvp.action',
      limit: env.PVP_ACTION_RATE_LIMIT_MAX,
      windowMs: env.PVP_ACTION_RATE_LIMIT_WINDOW_MS,
    },
    admin: {
      name: 'pvp.admin',
      limit: env.PVP_ADMIN_RATE_LIMIT_MAX,
      windowMs: env.PVP_ADMIN_RATE_LIMIT_WINDOW_MS,
    },
  };
}

export function getAuthRateLimitConfig() {
  return {
    nonce: {
      name: 'auth.nonce',
      limit: env.AUTH_NONCE_RATE_LIMIT_MAX,
      windowMs: env.AUTH_NONCE_RATE_LIMIT_WINDOW_MS,
    },
    verify: {
      name: 'auth.verify',
      limit: env.AUTH_VERIFY_RATE_LIMIT_MAX,
      windowMs: env.AUTH_VERIFY_RATE_LIMIT_WINDOW_MS,
    },
  };
}

export function getPvpStorageAdapter(): 'memory' | 'postgres' {
  return env.PVP_STORAGE_ADAPTER;
}

export function getShopStorageAdapter(): 'memory' | 'postgres' {
  return env.SHOP_STORAGE_ADAPTER;
}
