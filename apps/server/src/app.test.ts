import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from './app.js';
import { closePvpStorage } from './pvp/pvpStorage.js';

describe('server hardening', () => {
  afterEach(async () => {
    await closePvpStorage();
  });

  it('serves /health with security headers (helmet)', async () => {
    const app = await buildServer({ logger: false });
    try {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true, service: 'chronofrost-server' });
      // helmet default: nosniff + frameguard
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const app = await buildServer({ logger: false });
    try {
      const res = await app.inject({ method: 'GET', url: '/definitely-not-a-route' });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'not found' });
    } finally {
      await app.close();
    }
  });

  it('rejects an oversized request body', async () => {
    const app = await buildServer({ logger: false });
    try {
      const big = 'x'.repeat(300 * 1024); // > 256 KB bodyLimit
      const res = await app.inject({
        method: 'POST',
        url: '/auth/nonce',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ wallet: big }),
      });
      expect(res.statusCode).toBe(413);
    } finally {
      await app.close();
    }
  });
});
