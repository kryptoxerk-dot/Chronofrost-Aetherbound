import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { InventoryGrant, ShopOrder } from '../../services/inMemoryStore.js';
import type { SqlClient, SqlQueryResult } from '../../pvp/adapters/postgresRepositories.js';
import { createPostgresShopRepository } from './postgresShopRepository.js';

class FakeShopDb implements SqlClient {
  orders = new Map<string, Record<string, unknown>>();
  grants: Record<string, unknown>[] = [];
  private tick = 1_700_000_000_000;

  private now(): string {
    this.tick += 1;
    return new Date(this.tick).toISOString();
  }

  async query<T = unknown>(raw: string, params: readonly unknown[] = []): Promise<SqlQueryResult<T>> {
    const sql = raw.replace(/\s+/g, ' ').trim();

    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };

    if (sql.startsWith('INSERT INTO shop_orders')) {
      const [orderId, buyerWallet, itemId, mint, amountRaw, decimals, treasuryTokenAccount, nonce, expiresAt, status, createdAt] =
        params as [string, string, string, string, string, number, string, string, string, string, string];
      const row = {
        order_id: orderId,
        buyer_wallet: buyerWallet,
        item_id: itemId,
        mint,
        amount_raw: amountRaw,
        decimals,
        treasury_token_account: treasuryTokenAccount,
        nonce,
        expires_at: expiresAt,
        status,
        tx_signature: null,
        created_at: createdAt,
        confirmed_at: null,
      };
      this.orders.set(orderId, row);
      return { rows: [{ ...row }] as T[] };
    }

    if (sql.startsWith('SELECT * FROM shop_orders WHERE order_id = $1')) {
      const row = this.orders.get(params[0] as string);
      return { rows: (row ? [{ ...row }] : []) as T[] };
    }

    if (sql.startsWith("UPDATE shop_orders SET status = 'pending'")) {
      const row = this.orders.get(params[0] as string);
      if (row?.status === 'confirming') row.status = 'pending';
      return { rows: [] };
    }

    if (sql.startsWith("UPDATE shop_orders SET status = 'confirmed'")) {
      const row = this.orders.get(params[0] as string);
      if (row) {
        row.status = 'confirmed';
        row.tx_signature = params[1];
        row.confirmed_at = this.now();
      }
      return { rows: [] };
    }

    if (sql.startsWith("UPDATE shop_orders SET status = 'confirming'")) {
      const row = this.orders.get(params[0] as string);
      if (row?.status === 'pending') {
        row.status = 'confirming';
        return { rows: [{ order_id: params[0] }] as T[] };
      }
      return { rows: [] as T[] };
    }

    if (sql.startsWith('SELECT 1 AS found FROM shop_orders')) {
      const tx = params[0] as string;
      const orderHit = [...this.orders.values()].some((row) => row.tx_signature === tx);
      const grantHit = this.grants.some((row) => row.tx_signature === tx);
      return { rows: (orderHit || grantHit ? [{ found: 1 }] : []) as T[] };
    }

    if (sql.startsWith('INSERT INTO shop_inventory_grants')) {
      const [wallet, itemId, source, orderId, txSignature, createdAt] = params as [string, string, string, string, string, string];
      const duplicate = this.grants.some((row) => row.order_id === orderId || row.tx_signature === txSignature);
      if (!duplicate) {
        this.grants.push({
          id: this.grants.length + 1,
          wallet,
          item_id: itemId,
          source,
          order_id: orderId,
          tx_signature: txSignature,
          created_at: createdAt,
        });
      }
      return { rows: [] };
    }

    if (sql.startsWith('SELECT wallet, item_id, source, order_id, tx_signature, created_at FROM shop_inventory_grants')) {
      const wallet = params[0] as string;
      return { rows: this.grants.filter((row) => row.wallet === wallet).map((row) => ({ ...row })) as T[] };
    }

    throw new Error(`FakeShopDb: unhandled SQL: ${sql}`);
  }
}

function makeOrder(): ShopOrder {
  return {
    orderId: randomUUID(),
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

describe('postgres shop repository', () => {
  let db: FakeShopDb;
  let repo: ReturnType<typeof createPostgresShopRepository>;

  beforeEach(() => {
    db = new FakeShopDb();
    repo = createPostgresShopRepository(db);
  });

  it('creates, claims, confirms, and retrieves a durable order', async () => {
    const order = await repo.createOrder(makeOrder());
    await expect(repo.getOrder(order.orderId)).resolves.toMatchObject({ orderId: order.orderId, status: 'pending' });

    await expect(repo.claimOrderForConfirmation(order.orderId)).resolves.toBe(true);
    await expect(repo.claimOrderForConfirmation(order.orderId)).resolves.toBe(false);
    await repo.markOrderConfirmed(order.orderId, 'tx-mainnet');

    await expect(repo.getOrder(order.orderId)).resolves.toMatchObject({ status: 'confirmed', txSignature: 'tx-mainnet' });
    await expect(repo.hasUsedTx('tx-mainnet')).resolves.toBe(true);
  });

  it('deduplicates grants by order or transaction signature', async () => {
    const order = await repo.createOrder(makeOrder());
    const grant: InventoryGrant = {
      wallet: order.buyerWallet,
      itemId: order.itemId,
      source: 'aether',
      orderId: order.orderId,
      txSignature: 'tx-grant',
      createdAt: new Date().toISOString(),
    };

    await repo.grantInventory(grant);
    await repo.grantInventory({ ...grant, createdAt: new Date().toISOString() });

    await expect(repo.getInventory(order.buyerWallet)).resolves.toEqual([grant]);
    await expect(repo.hasUsedTx('tx-grant')).resolves.toBe(true);
  });
});
