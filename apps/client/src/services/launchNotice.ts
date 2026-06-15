import type { GameState } from '../systems/gameState';

export const LAUNCH_NOTICE_LINES = [
  'Free browser RPG prototype.',
  'Wallet is optional; guest play works.',
  '$AETHER is cosmetics/profile identity only.',
  'No staking, betting, entry fees, or token rewards.',
];

export function shouldShowLaunchNotice(state: GameState): boolean {
  return !state.launchNoticeAccepted;
}

export function launchNoticeText(): string {
  return LAUNCH_NOTICE_LINES.join('\n');
}
