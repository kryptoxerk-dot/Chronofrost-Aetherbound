import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Connection, PublicKey } from '@solana/web3.js';
import { env, requireConfiguredSolana, requirePvpAdminToken } from '../config/env.js';
import { getShopItem, SHOP_ITEMS } from '../data/items.js';
import { verifyPurchaseTransaction } from '../solana/verifyPurchaseTransaction.js';
import { getShopStorage } from '../shop/shopStorage.js';

const QuoteBody = z.object({
  wallet: z.string().min(32),
  itemId: z.string().min(1).max(80),
});

const ConfirmBody = z.object({
  orderId: z.string().uuid(),
  txSignature: z.string().min(32).max(128),
});

const ShopStatusBody = z.object({
  purchasesEnabled: z.boolean(),
  reason: z.string().max(240).optional(),
});

let purchasesEnabled = env.SHOP_PURCHASES_ENABLED;
let purchasesDisabledReason = purchasesEnabled ? undefined : 'disabled by SHOP_PURCHASES_ENABLED';

function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const token = request.headers['x-admin-token'];
  try {
    const expected = requirePvpAdminToken();
    if (typeof token === 'string' && token.length > 0 && token === expected) return true;
  } catch {
    // fall through to the generic auth failure
  }
  reply.code(401).send({ error: 'admin authentication required' });
  return false;
}

function rejectWhenPurchasesDisabled(reply: FastifyReply): boolean {
  if (purchasesEnabled) return false;
  reply.code(503).send({
    error: 'shop purchases disabled',
    reason: purchasesDisabledReason ?? 'operator disabled purchases',
  });
  return true;
}

export async function shopRoutes(app: FastifyInstance) {
  const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

  app.get('/shop/items', async () => SHOP_ITEMS.filter((item: { active: boolean }) => item.active));

  app.post('/shop/quote', async (request, reply) => {
    if (rejectWhenPurchasesDisabled(reply)) return;

    try {
      requireConfiguredSolana();
    } catch (err) {
      return reply.code(503).send({ error: err instanceof Error ? err.message : 'solana not configured' });
    }

    const body = QuoteBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    try {
      new PublicKey(body.data.wallet);
      new PublicKey(env.AETHER_MINT);
      new PublicKey(env.TREASURY_TOKEN_ACCOUNT);
    } catch {
      return reply.code(400).send({ error: 'invalid wallet or server mint/treasury config' });
    }

    const item = getShopItem(body.data.itemId);
    if (!item) return reply.code(404).send({ error: 'item not found' });

    const orderId = crypto.randomUUID();
    const order = {
      orderId,
      buyerWallet: body.data.wallet,
      itemId: item.id,
      mint: env.AETHER_MINT,
      amountRaw: item.priceAetherRaw,
      decimals: item.decimals,
      treasuryTokenAccount: env.TREASURY_TOKEN_ACCOUNT,
      nonce: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await getShopStorage().createOrder(order);

    return {
      orderId: order.orderId,
      itemId: order.itemId,
      buyerWallet: order.buyerWallet,
      mint: order.mint,
      amountRaw: order.amountRaw,
      decimals: order.decimals,
      treasuryTokenAccount: order.treasuryTokenAccount,
      expiresAt: order.expiresAt,
      memo: `chronofrost:${order.orderId}`,
    };
  });

  app.post('/shop/confirm', async (request, reply) => {
    if (rejectWhenPurchasesDisabled(reply)) return;

    const body = ConfirmBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    const shop = getShopStorage();
    const order = await shop.getOrder(body.data.orderId);
    if (!order) return reply.code(404).send({ error: 'order not found' });
    if (order.status !== 'pending') return reply.code(409).send({ error: `order is ${order.status}` });
    const expiresAtMs = Date.parse(order.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return reply.code(410).send({ error: 'order expired' });
    if (await shop.hasUsedTx(body.data.txSignature)) return reply.code(409).send({ error: 'transaction already used' });

    if (!(await shop.claimOrderForConfirmation(order.orderId))) {
      return reply.code(409).send({ error: 'order is already being confirmed' });
    }

    const verified = await verifyPurchaseTransaction(connection, order, body.data.txSignature).catch(async (err: unknown) => {
      await shop.releaseOrderToPending(order.orderId);
      throw err;
    });

    if (!verified.ok) {
      await shop.releaseOrderToPending(order.orderId);
      return reply.code(400).send({ error: verified.reason });
    }

    if (await shop.hasUsedTx(body.data.txSignature)) {
      await shop.releaseOrderToPending(order.orderId);
      return reply.code(409).send({ error: 'transaction already used' });
    }

    await shop.markOrderConfirmed(order.orderId, body.data.txSignature);
    await shop.grantInventory({
      wallet: order.buyerWallet,
      itemId: order.itemId,
      source: 'aether',
      orderId: order.orderId,
      txSignature: body.data.txSignature,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, itemId: order.itemId };
  });

  app.get('/inventory/:wallet', async (request, reply) => {
    const params = z.object({ wallet: z.string().min(32) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid wallet' });
    return await getShopStorage().getInventory(params.data.wallet);
  });

  app.get('/admin/shop/status', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return {
      purchasesEnabled,
      reason: purchasesDisabledReason ?? null,
      storageAdapter: env.SHOP_STORAGE_ADAPTER,
    };
  });

  app.post('/admin/shop/status', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = ShopStatusBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    purchasesEnabled = body.data.purchasesEnabled;
    purchasesDisabledReason = purchasesEnabled ? undefined : body.data.reason ?? 'operator disabled purchases';
    return {
      purchasesEnabled,
      reason: purchasesDisabledReason ?? null,
      storageAdapter: env.SHOP_STORAGE_ADAPTER,
    };
  });
}
