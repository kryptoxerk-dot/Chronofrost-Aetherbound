import { describe, it, expect, beforeEach } from 'vitest';
import {
  addReward,
  spendGold,
  grantInventory,
  getGameState,
  resetGameState,
  xpForNextLevel,
} from './gameState';

describe('game state (off-chain, wallet-free)', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('applies rewards and levels up without a wallet', () => {
    const result = addReward({ gold: 40, xp: xpForNextLevel(1) + 5 });
    const state = getGameState();

    expect(state.walletAddress).toBeNull();
    expect(state.gold).toBe(40);
    expect(result.leveledUp).toBe(true);
    expect(state.level).toBe(2);
    expect(state.xp).toBe(5);
  });

  it('ignores duplicate inventory grants', () => {
    expect(grantInventory('founder_palette')).toBe(true);
    expect(grantInventory('founder_palette')).toBe(false);
    expect(getGameState().inventory).toEqual(['founder_palette']);
  });

  it('rejects invalid or unaffordable gold spends', () => {
    addReward({ gold: 100 });

    expect(spendGold(Number.NaN)).toBe(false);
    expect(spendGold(Number.POSITIVE_INFINITY)).toBe(false);
    expect(spendGold(-5)).toBe(false);
    expect(spendGold(99999)).toBe(false);
    expect(getGameState().gold).toBe(100);

    expect(spendGold(40)).toBe(true);
    expect(getGameState().gold).toBe(60);
  });
});
