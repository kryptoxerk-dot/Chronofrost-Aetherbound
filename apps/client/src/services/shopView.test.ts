import { describe, expect, it } from 'vitest';
import { clusterLabel, questHudLine, shopErrorMessage, walletStatusLine } from './shopView';
import type { GameState } from '../systems/gameState';

function state(overrides: Partial<GameState> = {}): GameState {
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
    launchNoticeAccepted: false,
    seenHowToPlay: false,
    muted: false,
    walletAddress: null,
    aetherBalanceUi: null,
    ...overrides,
  };
}

describe('shop and launch HUD copy helpers', () => {
  it('formats network labels for wallet copy', () => {
    expect(clusterLabel('mainnet-beta')).toBe('mainnet');
    expect(clusterLabel('devnet')).toBe('devnet');
    expect(clusterLabel('')).toBe('network');
  });

  it('makes wallet optional in guest status copy', () => {
    expect(walletStatusLine(state({ gold: 42 }), 'mainnet-beta')).toBe('Guest mode - Gold 42 - wallet optional');
    expect(walletStatusLine(state({ walletAddress: 'ABCDEFGH123456789', aetherBalanceUi: '12', gold: 3 }), 'mainnet-beta'))
      .toContain('mainnet');
  });

  it('converts disabled or unconfigured AETHER purchases into Gold fallback copy', () => {
    expect(shopErrorMessage(new Error('shop purchases disabled'))).toBe('AETHER purchases are paused; Gold shop still works.');
    expect(shopErrorMessage(new Error('Missing Solana config: AETHER_MINT'))).toBe('AETHER purchases are not configured yet; Gold shop still works.');
  });

  it('summarizes the current quest for the HUD', () => {
    expect(questHudLine(state())).toBe('Quest: Talk to Elder');
    expect(questHudLine(state({ questAccepted: true }))).toBe('Quest: Clear Frostglass');
    expect(questHudLine(state({ questAccepted: true, questComplete: true }))).toBe('Quest: Warden defeated');
  });
});
