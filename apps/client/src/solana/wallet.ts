import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { ENV } from '../config/gameConfig';
import { updateGameState } from '../systems/gameState';

export async function connectPhantom(): Promise<string> {
  const provider = window.solana;
  if (!provider?.isPhantom) {
    throw new Error('Phantom not found. Game remains playable as guest.');
  }
  const response = await provider.connect();
  const wallet = response.publicKey.toBase58();
  updateGameState({ walletAddress: wallet });
  return wallet;
}

export async function getAetherBalance(walletAddress: string): Promise<string> {
  if (!ENV.aetherMint) return 'devnet mint not configured';
  const connection = new Connection(ENV.solanaRpcUrl, 'confirmed');
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(ENV.aetherMint);
  const ata = await getAssociatedTokenAddress(mint, owner);
  const balance = await connection.getTokenAccountBalance(ata).catch(() => null);
  const ui = balance?.value.uiAmountString ?? '0';
  updateGameState({ aetherBalanceUi: ui });
  return ui;
}
