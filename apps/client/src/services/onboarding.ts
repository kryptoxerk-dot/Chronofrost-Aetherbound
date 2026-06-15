import type { GameState } from '../systems/gameState';

// First-run "How to Play" content + gating. Pure and framework-free so it can be
// unit-tested; TownScene renders it once and marks it seen.

export const HOW_TO_PLAY_TITLE = 'HOW TO PLAY';

export const HOW_TO_PLAY_LINES: string[] = [
  'Move: Arrow keys or WASD',
  'Interact / confirm: E or Space',
  'Talk to the ELDER to accept the quest,',
  'then enter the DUNGEON.',
  'Battle: [A] Attack  [F] Chronofreeze  [D] Defend',
  'Freeze costs MP and delays the foe.',
  '[M] toggles sound.  Esc backs out.',
  'No wallet needed to play — cosmetics only.',
];

/**
 * Show the first-run guide once. The launch notice is acknowledged first, so we
 * gate on it too (the player should clear the notice before the tutorial).
 */
export function shouldShowHowToPlay(state: Pick<GameState, 'seenHowToPlay' | 'launchNoticeAccepted'>): boolean {
  return !state.seenHowToPlay && state.launchNoticeAccepted;
}
