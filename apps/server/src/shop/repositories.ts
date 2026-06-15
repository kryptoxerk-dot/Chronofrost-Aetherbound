import type { InventoryGrant, ShopOrder } from '../services/inMemoryStore.js';

export interface ShopRepository {
  createOrder(order: ShopOrder): Promise<ShopOrder>;
  getOrder(orderId: string): Promise<ShopOrder | null>;
  claimOrderForConfirmation(orderId: string): Promise<boolean>;
  releaseOrderToPending(orderId: string): Promise<void>;
  markOrderConfirmed(orderId: string, txSignature: string): Promise<void>;
  hasUsedTx(txSignature: string): Promise<boolean>;
  grantInventory(grant: InventoryGrant): Promise<void>;
  getInventory(wallet: string): Promise<InventoryGrant[]>;
}
