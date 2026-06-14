import { requestNonce, verifySignature } from './pvpApi';
import { updateGameState } from '../systems/gameState';

// Browser SIWS (Sign-In With Solana) orchestration for ranked PvP. Wallet stays
// optional until the player chooses a ranked action; this is only invoked then.
// The session token is held in memory for the tab's lifetime — it is an auth
// session, not a token-transfer authorization.

let sessionToken: string | null = null;
let sessionWallet: string | null = null;

export function getPvpSessionToken(): string | null {
  return sessionToken;
}

export function getPvpSessionWallet(): string | null {
  return sessionWallet;
}

export function isPvpAuthenticated(): boolean {
  return sessionToken !== null;
}

export function clearPvpSession(): void {
  sessionToken = null;
  sessionWallet = null;
}

export async function authenticateForPvp(): Promise<{ wallet: string; sessionToken: string }> {
  const provider = window.solana;
  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found. Ranked PvP needs a Solana wallet; guest play continues without it.');
  }
  if (!provider.signMessage) {
    throw new Error('This wallet cannot sign messages, so it cannot sign in for ranked PvP.');
  }

  const connection = await provider.connect();
  const wallet = connection.publicKey.toBase58();

  const { nonce, message } = await requestNonce(wallet);
  const signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
  const result = await verifySignature(wallet, nonce, Array.from(signed.signature));
  if (!result.ok) throw new Error('Signature verification failed.');

  sessionToken = result.sessionToken;
  sessionWallet = result.wallet;
  updateGameState({ walletAddress: result.wallet });
  return { wallet: result.wallet, sessionToken: result.sessionToken };
}
