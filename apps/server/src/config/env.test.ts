import { describe, it, expect } from 'vitest';
import { productionConfigProblems } from './env.js';

type Cfg = Parameters<typeof productionConfigProblems>[0] & object;

function cfg(overrides: Partial<Cfg> = {}): Cfg {
  return {
    NODE_ENV: 'production',
    SESSION_SECRET: 'a-strong-enough-secret-value',
    PVP_STORAGE_ADAPTER: 'memory',
    DATABASE_URL: '',
    ...overrides,
  } as Cfg;
}

describe('production config validation', () => {
  it('skips all checks outside production', () => {
    expect(productionConfigProblems(cfg({ NODE_ENV: 'development', SESSION_SECRET: 'dev-only-change-me' }))).toEqual([]);
  });

  it('rejects the dev session secret in production', () => {
    const problems = productionConfigProblems(cfg({ SESSION_SECRET: 'dev-only-change-me' }));
    expect(problems.join(' ')).toMatch(/SESSION_SECRET/);
  });

  it('rejects a too-short session secret in production', () => {
    expect(productionConfigProblems(cfg({ SESSION_SECRET: 'short' })).join(' ')).toMatch(/16 characters/);
  });

  it('requires DATABASE_URL when postgres storage is selected', () => {
    const problems = productionConfigProblems(cfg({ PVP_STORAGE_ADAPTER: 'postgres', DATABASE_URL: '' }));
    expect(problems.join(' ')).toMatch(/DATABASE_URL/);
  });

  it('passes with a strong secret and consistent storage config', () => {
    expect(productionConfigProblems(cfg())).toEqual([]);
    expect(productionConfigProblems(cfg({ PVP_STORAGE_ADAPTER: 'postgres', DATABASE_URL: 'postgres://x' }))).toEqual([]);
  });
});
