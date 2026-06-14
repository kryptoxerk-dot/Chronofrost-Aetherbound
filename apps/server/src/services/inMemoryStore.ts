import crypto from 'node:crypto';

export type OrderStatus = 'pending' | 'confirming' | 'confirmed' | 'expired' | 'failed';

export type ShopOrder = {
  orderId: string;
  buyerWallet: string;
  itemId: string;
  mint: string;
  amountRaw: string;
  decimals: number;
  treasuryTokenAccount: string;
  nonce: string;
  expiresAt: string;
  status: OrderStatus;
  txSignature?: string;
  createdAt: string;
};

export type InventoryGrant = {
  wallet: string;
  itemId: string;
  source: 'aether';
  orderId: string;
  txSignature: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  wallet: string;
  createdAt: string;
  expiresAt: string;
};

const orders = new Map<string, ShopOrder>();
const usedTxSignatures = new Set<string>();
const inventory = new Map<string, InventoryGrant[]>();
const nonces = new Map<string, { wallet: string; message: string; expiresAt: string; consumed: boolean }>();
const sessions = new Map<string, AuthSession>();

function cloneSession(session: AuthSession): AuthSession {
  return { ...session };
}

export const store = {
  saveNonce(nonce: string, data: { wallet: string; message: string; expiresAt: string; consumed: boolean }) {
    nonces.set(nonce, data);
  },
  getNonce(nonce: string) {
    return nonces.get(nonce);
  },
  consumeNonce(nonce: string) {
    const found = nonces.get(nonce);
    if (found) found.consumed = true;
  },
  // Atomically claim a nonce: returns true only for the FIRST caller.
  claimNonce(nonce: string): boolean {
    const found = nonces.get(nonce);
    if (!found || found.consumed) return false;
    found.consumed = true;
    return true;
  },

  createSession(wallet: string, ttlMs = 12 * 60 * 60_000): AuthSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session: AuthSession = {
      token,
      wallet,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };
    sessions.set(token, session);
    return cloneSession(session);
  },
  getSession(token: string | undefined): AuthSession | undefined {
    if (!token) return undefined;
    const session = sessions.get(token);
    if (!session) return undefined;
    const expiresAtMs = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      sessions.delete(token);
      return undefined;
    }
    return cloneSession(session);
  },
  revokeSession(token: string): boolean {
    return sessions.delete(token);
  },

  saveOrder(order: ShopOrder) {
    orders.set(order.orderId, order);
  },
  getOrder(orderId: string) {
    return orders.get(orderId);
  },
  claimOrderForConfirmation(orderId: string): boolean {
    const order = orders.get(orderId);
    if (!order || order.status !== 'pending') return false;
    order.status = 'confirming';
    return true;
  },
  releaseOrderToPending(orderId: string) {
    const order = orders.get(orderId);
    if (order && order.status === 'confirming') order.status = 'pending';
  },
  markOrderConfirmed(orderId: string, txSignature: string) {
    const order = orders.get(orderId);
    if (!order) throw new Error('order not found');
    order.status = 'confirmed';
    order.txSignature = txSignature;
    usedTxSignatures.add(txSignature);
  },
  hasUsedTx(txSignature: string) {
    return usedTxSignatures.has(txSignature);
  },
  grantInventory(grant: InventoryGrant) {
    const list = inventory.get(grant.wallet) ?? [];
    const exists = list.some((item) => item.orderId === grant.orderId || item.txSignature === grant.txSignature);
    if (!exists) list.push(grant);
    inventory.set(grant.wallet, list);
  },
  getInventory(wallet: string) {
    return inventory.get(wallet) ?? [];
  },

  _resetForTests() {
    orders.clear();
    usedTxSignatures.clear();
    inventory.clear();
    nonces.clear();
    sessions.clear();
  },
};
