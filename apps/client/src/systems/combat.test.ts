import { describe, it, expect } from 'vitest';
import { COMBAT_CONFIG } from '../config/balance';
import {
  createBattle,
  heroAct,
  enemyAct,
  canFreeze,
  simulateBattle,
  attackPolicy,
  freezePolicy,
  defendPolicy,
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

  it('Defending gathers aether — restoring MP a plain turn would not', () => {
    const guarded = createBattle('chrono_warden');
    guarded.hero.mp = 1; // below the Chronofreeze cost
    heroAct(guarded, 'defend');
    // turn regen (+1) plus the defend bonus refuels enough to Chronofreeze next.
    expect(guarded.hero.mp).toBe(1 + COMBAT_CONFIG.mpRegenPerTurn + COMBAT_CONFIG.defend.mpBonus);
    expect(canFreeze(guarded.hero)).toBe(true);

    const attacked = createBattle('chrono_warden');
    attacked.hero.mp = 1;
    heroAct(attacked, 'attack');
    expect(attacked.hero.mp).toBe(1 + COMBAT_CONFIG.mpRegenPerTurn);
    expect(canFreeze(attacked.hero)).toBe(false);
  });

  it('Defending alone cannot win — it deals no damage', () => {
    const { winner, state } = simulateBattle('frost_slime', defendPolicy);
    expect(winner).toBe('enemy');
    expect(state.enemy.hp).toBe(state.enemy.maxHp);
  });

  it('An attack-only strategy loses to the boss', () => {
    const { winner } = simulateBattle('chrono_warden', attackPolicy);
    expect(winner).toBe('enemy');
  });

  it('A freeze-first strategy beats the boss', () => {
    const { winner } = simulateBattle('chrono_warden', freezePolicy);
    expect(winner).toBe('hero');
  });

  it('Enemies just attack under the deterministic default rng (sim-stable)', () => {
    const state = createBattle('chrono_warden'); // default rng never rolls a special/guard
    const before = state.hero.hp;
    enemyAct(state);
    expect(state.enemy.defending).toBe(false); // did not guard
    expect(before - state.hero.hp).toBe(state.enemy.attack - state.hero.defense); // plain hit
  });

  it('The Clock Wraith can blur forward to act sooner (haste)', () => {
    const state = createBattle('clock_wraith', { rng: () => 0.1 }); // below specialChance
    const baseWait = COMBAT_CONFIG.timelineBase / state.enemy.speed;
    const before = state.hero.hp;
    enemyAct(state);
    expect(state.hero.hp).toBeLessThan(before); // haste still strikes
    expect(state.enemy.wait).toBeLessThan(baseWait); // and resets faster than normal
  });

  it('The Crystal Golem braces instead of attacking (guard)', () => {
    const state = createBattle('crystal_golem', { rng: () => 0.1 }); // within guardChance
    const before = state.hero.hp;
    enemyAct(state);
    expect(state.enemy.defending).toBe(true);
    expect(state.hero.hp).toBe(before); // a brace deals no damage
  });

  it('The Chrono Warden Temporal Surge hits harder than a normal blow', () => {
    const surge = createBattle('chrono_warden', { rng: () => 0.1 }); // triggers special
    enemyAct(surge);
    const surgeLoss = surge.hero.maxHp - surge.hero.hp;

    const normal = createBattle('chrono_warden', { rng: () => 0.99 }); // plain attack
    enemyAct(normal);
    const normalLoss = normal.hero.maxHp - normal.hero.hp;

    expect(surgeLoss).toBeGreaterThan(normalLoss);
  });
});
