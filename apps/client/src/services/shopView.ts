import type { GameState } from '../systems/gameState';

export function clusterLabel(cluster: string): string {
  const normalized = cluster.trim().toLowerCase();
  if (normalized === 'mainnet-beta') return 'mainnet';
  if (normalized === 'devnet') return 'devnet';
  if (normalized === 'testnet') return 'testnet';
  return normalized || 'network';
}

export function walletStatusLine(state: GameState, cluster: string): string {
  const network = clusterLabel(cluster);
  if (!state.walletAddress) {
    return `Guest mode - Gold ${state.gold} - wallet optional`;
  }
  return `Wallet ${state.walletAddress.slice(0, 4)}..${state.walletAddress.slice(-4)}  $AETHER ${state.aetherBalanceUi ?? '-'}  ${network}  Gold ${state.gold}`;
}

export function shopErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Purchase failed.';
  if (message === 'shop purchases disabled') {
    return 'AETHER purchases are paused; Gold shop still works.';
  }
  if (message.includes('Missing Solana config')) {
    return 'AETHER purchases are not configured yet; Gold shop still works.';
  }
  return message;
}

export function questHudLine(state: GameState): string {
  if (state.questComplete) return 'Quest: Warden defeated';
  if (state.questAccepted) return 'Quest: Clear Frostglass';
  return 'Quest: Talk to Elder';
}
