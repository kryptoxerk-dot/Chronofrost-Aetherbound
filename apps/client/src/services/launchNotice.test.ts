import { describe, expect, it } from 'vitest';
import { LAUNCH_NOTICE_LINES, launchNoticeText, shouldShowLaunchNotice } from './launchNotice';
import type { GameState } from '../systems/gameState';

function state(launchNoticeAccepted: boolean): GameState {
  return {
    gold: 0,
    xp: 0,
    level: 1,
    hp: 32,
    mp: 10,
    inventory: [],
    questAccepted: false,
    questComplete: false,
    bossDefeated: false,
    launchNoticeAccepted,
    walletAddress: null,
    aetherBalanceUi: null,
  };
}

describe('launch notice', () => {
  it('is shown until the player acknowledges it', () => {
    expect(shouldShowLaunchNotice(state(false))).toBe(true);
    expect(shouldShowLaunchNotice(state(true))).toBe(false);
  });

  it('states wallet optionality and prohibited reward mechanics', () => {
    const text = launchNoticeText();
    expect(text).toContain('Wallet is optional');
    expect(text).toContain('cosmetics/profile identity only');
    expect(text).toContain('No staking');
    expect(text).toContain('betting');
    expect(text).toContain('token rewards');
    expect(LAUNCH_NOTICE_LINES).toHaveLength(4);
  });
});
