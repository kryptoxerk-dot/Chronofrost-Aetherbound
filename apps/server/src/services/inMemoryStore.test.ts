import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { store, type ShopOrder } from './inMemoryStore.js';

function makeOrder(orderId: string): ShopOrder {
  return {
    orderId,
    buyerWallet: '11111111111111111111111111111111',
    itemId: 'founder_palette',
    mint: '11111111111111111111111111111111',
    amountRaw: '1000000',
    decimals: 6,
    treasuryTokenAccount: '11111111111111111111111111111111',
    nonce: 'nonce',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

describe('in-memory store atomic guards', () => {
  it('allows a nonce to be claimed exactly once', () => {
    const nonce = randomUUID();
    store.saveNonce(nonce, {
      wallet: '11111111111111111111111111111111',
      message: 'message',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      consumed: false,
    });

    expect(store.claimNonce(nonce)).toBe(true);
    expect(store.claimNonce(nonce)).toBe(false);
    expect(store.claimNonce(nonce)).toBe(false);
  });

  it('allows an order confirmation to be claimed exactly once', () => {
    const orderId = randomUUID();
    store.saveOrder(makeOrder(orderId));

    expect(store.claimOrderForConfirmation(orderId)).toBe(true);
    expect(store.claimOrderForConfirmation(orderId)).toBe(false);
    expect(store.getOrder(orderId)?.status).toBe('confirming');

    store.releaseOrderToPending(orderId);
    expect(store.getOrder(orderId)?.status).toBe('pending');
  });

  it('deduplicates inventory grants by order ID or transaction signature', () => {
    const wallet = randomUUID();
    const orderId = randomUUID();
    const grant = {
      wallet,
      itemId: 'founder_palette',
      source: 'aether' as const,
      orderId,
      txSignature: 'abc'.repeat(32),
      createdAt: new Date().toISOString(),
    };

    store.grantInventory(grant);
    store.grantInventory({ ...grant, createdAt: new Date().toISOString() });
    store.grantInventory({ ...grant, orderId: randomUUID() });

    expect(store.getInventory(wallet)).toHaveLength(1);
  });
});
