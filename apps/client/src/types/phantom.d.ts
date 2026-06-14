import type { PublicKey, Transaction } from '@solana/web3.js';

export {};

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: PublicKey;
      connect: () => Promise<{ publicKey: PublicKey }>;
      signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
    };
  }
}
