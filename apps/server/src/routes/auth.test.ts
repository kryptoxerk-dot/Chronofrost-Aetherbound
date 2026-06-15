import Fastify from 'fastify';
import { Keypair } from '@solana/web3.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    AUTH_NONCE_RATE_LIMIT_MAX: '1',
    AUTH_NONCE_RATE_LIMIT_WINDOW_MS: '60000',
    AUTH_VERIFY_RATE_LIMIT_MAX: '1',
    AUTH_VERIFY_RATE_LIMIT_WINDOW_MS: '60000',
  };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function buildApp() {
  const app = Fastify({ logger: false });
  const [{ authRoutes }, { store }] = await Promise.all([
    import('./auth.js'),
    import('../services/inMemoryStore.js'),
  ]);
  store._resetForTests();
  await app.register(authRoutes);
  return app;
}

describe('auth routes rate limiting', () => {
  it('rate-limits nonce requests by IP before issuing another nonce', async () => {
    const app = await buildApp();
    const wallet = Keypair.generate().publicKey.toBase58();

    const first = await app.inject({
      method: 'POST',
      url: '/auth/nonce',
      payload: { wallet },
    });
    expect(first.statusCode).toBe(200);
    expect(first.headers['x-ratelimit-name']).toBe('auth.nonce');

    const second = await app.inject({
      method: 'POST',
      url: '/auth/nonce',
      payload: { wallet },
    });
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({ error: 'rate limit exceeded' });

    await app.close();
  });

  it('rate-limits verify requests before parsing or checking signatures', async () => {
    const app = await buildApp();

    const first = await app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: {},
    });
    expect(first.statusCode).toBe(400);
    expect(first.headers['x-ratelimit-name']).toBe('auth.verify');

    const second = await app.inject({
      method: 'POST',
      url: '/auth/verify',
      payload: {},
    });
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({ error: 'rate limit exceeded' });

    await app.close();
  });
});
