import type { PublicKey, Transaction } from '@solana/web3.js';

export {};

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: PublicKey;
      connect: () => Promise<{ publicKey: PublicKey }>;
      signMessage?: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
      signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
    };
  }
}
