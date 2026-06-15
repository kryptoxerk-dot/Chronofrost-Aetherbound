import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    PVP_ADMIN_TOKEN: 'test-admin-token',
    SHOP_STORAGE_ADAPTER: 'memory',
    SHOP_PURCHASES_ENABLED: 'true',
  };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

async function buildApp() {
  const app = Fastify({ logger: false });
  const [{ shopRoutes }, { store }] = await Promise.all([
    import('./shop.js'),
    import('../services/inMemoryStore.js'),
  ]);
  store._resetForTests();
  await app.register(shopRoutes);
  return app;
}

describe('shop routes launch controls', () => {
  it('keeps catalog browsing alive when purchases are disabled', async () => {
    process.env.SHOP_PURCHASES_ENABLED = 'false';
    const app = await buildApp();

    const items = await app.inject({ method: 'GET', url: '/shop/items' });
    expect(items.statusCode).toBe(200);
    expect(items.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'founder_palette' })]));

    const quote = await app.inject({
      method: 'POST',
      url: '/shop/quote',
      payload: { wallet: '11111111111111111111111111111111', itemId: 'founder_palette' },
    });
    expect(quote.statusCode).toBe(503);
    expect(quote.json()).toMatchObject({ error: 'shop purchases disabled' });

    await app.close();
  });

  it('lets an admin operator toggle purchase availability at runtime', async () => {
    const app = await buildApp();

    const disabled = await app.inject({
      method: 'POST',
      url: '/admin/shop/status',
      headers: { 'x-admin-token': 'test-admin-token' },
      payload: { purchasesEnabled: false, reason: 'rollback smoke test' },
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json()).toMatchObject({ purchasesEnabled: false, reason: 'rollback smoke test' });

    const quote = await app.inject({
      method: 'POST',
      url: '/shop/quote',
      payload: { wallet: '11111111111111111111111111111111', itemId: 'founder_palette' },
    });
    expect(quote.statusCode).toBe(503);

    const enabled = await app.inject({
      method: 'POST',
      url: '/admin/shop/status',
      headers: { 'x-admin-token': 'test-admin-token' },
      payload: { purchasesEnabled: true },
    });
    expect(enabled.statusCode).toBe(200);
    expect(enabled.json()).toMatchObject({ purchasesEnabled: true, reason: null });

    await app.close();
  });

  it('rejects shop status changes without the admin token', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/shop/status',
      payload: { purchasesEnabled: false },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: 'admin authentication required' });
    await app.close();
  });
});
