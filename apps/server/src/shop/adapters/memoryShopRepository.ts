import { store, type InventoryGrant, type ShopOrder } from '../../services/inMemoryStore.js';
import type { ShopRepository } from '../repositories.js';

export function createMemoryShopRepository(): ShopRepository {
  return {
    async createOrder(order: ShopOrder): Promise<ShopOrder> {
      store.saveOrder(order);
      return { ...order };
    },

    async getOrder(orderId: string): Promise<ShopOrder | null> {
      const order = store.getOrder(orderId);
      return order ? { ...order } : null;
    },

    async claimOrderForConfirmation(orderId: string): Promise<boolean> {
      return store.claimOrderForConfirmation(orderId);
    },

    async releaseOrderToPending(orderId: string): Promise<void> {
      store.releaseOrderToPending(orderId);
    },

    async markOrderConfirmed(orderId: string, txSignature: string): Promise<void> {
      store.markOrderConfirmed(orderId, txSignature);
    },

    async hasUsedTx(txSignature: string): Promise<boolean> {
      return store.hasUsedTx(txSignature);
    },

    async grantInventory(grant: InventoryGrant): Promise<void> {
      store.grantInventory(grant);
    },

    async getInventory(wallet: string): Promise<InventoryGrant[]> {
      return store.getInventory(wallet).map((grant) => ({ ...grant }));
    },
  };
}
