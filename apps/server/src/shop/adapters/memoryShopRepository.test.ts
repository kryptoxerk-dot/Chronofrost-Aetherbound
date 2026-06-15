import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { store, type InventoryGrant, type ShopOrder } from '../../services/inMemoryStore.js';
import { createMemoryShopRepository } from './memoryShopRepository.js';

function makeOrder(orderId = randomUUID()): ShopOrder {
  return {
    orderId,
    buyerWallet: '11111111111111111111111111111111',
    itemId: 'founder_palette',
    mint: 'So11111111111111111111111111111111111111112',
    amountRaw: '1000000',
    decimals: 6,
    treasuryTokenAccount: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    nonce: randomUUID(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

describe('memory shop repository', () => {
  beforeEach(() => {
    store._resetForTests();
  });

  it('claims an order for confirmation exactly once', async () => {
    const repo = createMemoryShopRepository();
    const order = await repo.createOrder(makeOrder());

    await expect(repo.getOrder(order.orderId)).resolves.toMatchObject({ status: 'pending' });
    await expect(repo.claimOrderForConfirmation(order.orderId)).resolves.toBe(true);
    await expect(repo.claimOrderForConfirmation(order.orderId)).resolves.toBe(false);
    await expect(repo.getOrder(order.orderId)).resolves.toMatchObject({ status: 'confirming' });

    await repo.releaseOrderToPending(order.orderId);
    await expect(repo.getOrder(order.orderId)).resolves.toMatchObject({ status: 'pending' });
  });

  it('marks orders confirmed and deduplicates inventory grants', async () => {
    const repo = createMemoryShopRepository();
    const order = await repo.createOrder(makeOrder());
    const txSignature = 'abc'.repeat(32);
    const grant: InventoryGrant = {
      wallet: order.buyerWallet,
      itemId: order.itemId,
      source: 'aether',
      orderId: order.orderId,
      txSignature,
      createdAt: new Date().toISOString(),
    };

    await repo.markOrderConfirmed(order.orderId, txSignature);
    await repo.grantInventory(grant);
    await repo.grantInventory({ ...grant, createdAt: new Date().toISOString() });

    await expect(repo.hasUsedTx(txSignature)).resolves.toBe(true);
    await expect(repo.getInventory(order.buyerWallet)).resolves.toHaveLength(1);
  });
});
