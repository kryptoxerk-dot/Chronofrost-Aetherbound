import { describe, it, expect } from 'vitest';
import {
  createBattle,
  heroAct,
  enemyAct,
  simulateBattle,
  attackPolicy,
  freezePolicy,
} from './combat';

describe('Chronofrost combat', () => {
  it('Chronofreeze damages the enemy and pushes it down the timeline', () => {
    const state = createBattle('chrono_warden');
    const startHp = state.enemy.hp;
    const startWait = state.enemy.wait;

    heroAct(state, 'freeze');

    expect(state.enemy.hp).toBeLessThan(startHp);
    expect(state.enemy.wait).toBeGreaterThan(startWait);
    expect(state.hero.mp).toBeLessThan(state.hero.maxMp);
  });

  it('Defending reduces incoming damage', () => {
    const undefended = createBattle('chrono_warden');
    enemyAct(undefended);
    const undefendedLoss = undefended.hero.maxHp - undefended.hero.hp;

    const defended = createBattle('chrono_warden');
    heroAct(defended, 'defend');
    enemyAct(defended);
    const defendedLoss = defended.hero.maxHp - defended.hero.hp;

    expect(undefendedLoss).toBeGreaterThan(0);
    expect(defendedLoss).toBeLessThan(undefendedLoss);
  });

  it('An attack-only strategy loses to the boss', () => {
    const { winner } = simulateBattle('chrono_warden', attackPolicy);
    expect(winner).toBe('enemy');
  });

  it('A freeze-first strategy beats the boss', () => {
    const { winner } = simulateBattle('chrono_warden', freezePolicy);
    expect(winner).toBe('hero');
  });
});
