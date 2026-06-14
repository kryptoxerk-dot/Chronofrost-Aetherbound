import { ENV } from '../config/gameConfig';
import type { ShopQuote } from '../solana/purchase';

// Thin typed client over the Fastify backend. All calls are optional from the
// game's perspective: the demo loop runs fully offline if the server is down.

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  priceGold?: number;
  priceAetherRaw: string;
  decimals: number;
}

export interface InventoryGrant {
  wallet: string;
  itemId: string;
  source: 'aether';
  orderId: string;
  txSignature: string;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENV.apiBaseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data && typeof data.error === 'string' ? data.error : `request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function getShopItems(): Promise<ShopItem[]> {
  return request<ShopItem[]>('/shop/items');
}

export function requestQuote(wallet: string, itemId: string): Promise<ShopQuote> {
  return request<ShopQuote>('/shop/quote', {
    method: 'POST',
    body: JSON.stringify({ wallet, itemId }),
  });
}

export function confirmPurchase(orderId: string, txSignature: string): Promise<{ ok: boolean; itemId: string }> {
  return request('/shop/confirm', {
    method: 'POST',
    body: JSON.stringify({ orderId, txSignature }),
  });
}

export function getInventory(wallet: string): Promise<InventoryGrant[]> {
  return request<InventoryGrant[]>(`/inventory/${wallet}`);
}

export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export function requestNonce(wallet: string): Promise<NonceResponse> {
  return request<NonceResponse>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ wallet }),
  });
}
