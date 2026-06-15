import type { InventoryGrant, OrderStatus, ShopOrder } from '../../services/inMemoryStore.js';
import type { Queryable, SqlClient } from '../../pvp/adapters/postgresRepositories.js';
import type { ShopRepository } from '../repositories.js';

type ShopOrderRow = {
  order_id: string;
  buyer_wallet: string;
  item_id: string;
  mint: string;
  amount_raw: string;
  decimals: number | string;
  treasury_token_account: string;
  nonce: string;
  expires_at: unknown;
  status: OrderStatus;
  tx_signature: string | null;
  created_at: unknown;
};

type InventoryGrantRow = {
  wallet: string;
  item_id: string;
  source: InventoryGrant['source'];
  order_id: string;
  tx_signature: string;
  created_at: unknown;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToOrder(row: ShopOrderRow): ShopOrder {
  const order: ShopOrder = {
    orderId: row.order_id,
    buyerWallet: row.buyer_wallet,
    itemId: row.item_id,
    mint: row.mint,
    amountRaw: String(row.amount_raw),
    decimals: Number(row.decimals),
    treasuryTokenAccount: row.treasury_token_account,
    nonce: row.nonce,
    expiresAt: toIso(row.expires_at),
    status: row.status,
    createdAt: toIso(row.created_at),
  };
  if (row.tx_signature) order.txSignature = row.tx_signature;
  return order;
}

function rowToGrant(row: InventoryGrantRow): InventoryGrant {
  return {
    wallet: row.wallet,
    itemId: row.item_id,
    source: row.source,
    orderId: row.order_id,
    txSignature: row.tx_signature,
    createdAt: toIso(row.created_at),
  };
}

async function transact<T>(client: SqlClient, fn: (tx: Queryable) => Promise<T>): Promise<T> {
  if (client.connect) {
    const tx = await client.connect();
    try {
      await tx.query('BEGIN');
      const result = await fn(tx);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await tx.query('ROLLBACK');
      } catch {
        /* keep original failure */
      }
      throw error;
    } finally {
      tx.release();
    }
  }

  await client.query('BEGIN');
  try {
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* keep original failure */
    }
    throw error;
  }
}

export function createPostgresShopRepository(client: SqlClient): ShopRepository {
  return {
    async createOrder(order: ShopOrder): Promise<ShopOrder> {
      const res = await client.query<ShopOrderRow>(
        `INSERT INTO shop_orders
           (order_id, buyer_wallet, item_id, mint, amount_raw, decimals, treasury_token_account, nonce, expires_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          order.orderId,
          order.buyerWallet,
          order.itemId,
          order.mint,
          order.amountRaw,
          order.decimals,
          order.treasuryTokenAccount,
          order.nonce,
          order.expiresAt,
          order.status,
          order.createdAt,
        ],
      );
      return rowToOrder(res.rows[0]);
    },

    async getOrder(orderId: string): Promise<ShopOrder | null> {
      const res = await client.query<ShopOrderRow>(`SELECT * FROM shop_orders WHERE order_id = $1`, [orderId]);
      return res.rows[0] ? rowToOrder(res.rows[0]) : null;
    },

    async claimOrderForConfirmation(orderId: string): Promise<boolean> {
      const res = await client.query<{ order_id: string }>(
        `UPDATE shop_orders SET status = 'confirming'
           WHERE order_id = $1 AND status = 'pending'
         RETURNING order_id`,
        [orderId],
      );
      return res.rows.length === 1;
    },

    async releaseOrderToPending(orderId: string): Promise<void> {
      await client.query(
        `UPDATE shop_orders SET status = 'pending'
           WHERE order_id = $1 AND status = 'confirming'`,
        [orderId],
      );
    },

    async markOrderConfirmed(orderId: string, txSignature: string): Promise<void> {
      await client.query(
        `UPDATE shop_orders SET status = 'confirmed', tx_signature = $2, confirmed_at = now()
           WHERE order_id = $1`,
        [orderId, txSignature],
      );
    },

    async hasUsedTx(txSignature: string): Promise<boolean> {
      const res = await client.query<{ found: number }>(
        `SELECT 1 AS found FROM shop_orders WHERE tx_signature = $1
         UNION
         SELECT 1 AS found FROM shop_inventory_grants WHERE tx_signature = $1
         LIMIT 1`,
        [txSignature],
      );
      return res.rows.length > 0;
    },

    async grantInventory(grant: InventoryGrant): Promise<void> {
      await transact(client, async (tx) => {
        await tx.query(
          `INSERT INTO shop_inventory_grants (wallet, item_id, source, order_id, tx_signature, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [grant.wallet, grant.itemId, grant.source, grant.orderId, grant.txSignature, grant.createdAt],
        );
      });
    },

    async getInventory(wallet: string): Promise<InventoryGrant[]> {
      const res = await client.query<InventoryGrantRow>(
        `SELECT wallet, item_id, source, order_id, tx_signature, created_at
           FROM shop_inventory_grants
          WHERE wallet = $1
          ORDER BY created_at ASC, id ASC`,
        [wallet],
      );
      return res.rows.map(rowToGrant);
    },
  };
}
