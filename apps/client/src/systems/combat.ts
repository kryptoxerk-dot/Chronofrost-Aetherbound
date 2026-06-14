import { HERO_CONFIG, ENEMY_CONFIG, COMBAT_CONFIG } from '../config/balance';

// Pure, framework-free combat model. BattleScene drives it for the interactive
// game; tests drive it headlessly. No Phaser, DOM, or randomness leaks in here
// unless an rng is explicitly supplied.

export type CombatAction = 'attack' | 'freeze' | 'defend';
export type Side = 'hero' | 'enemy';
export type EnemyId = keyof typeof ENEMY_CONFIG;

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  defending: boolean;
  /** Timeline units until this combatant may act again. Lower acts sooner. */
  wait: number;
}

export interface BattleState {
  hero: Combatant;
  enemy: Combatant;
  log: string[];
  over: boolean;
  winner: Side | null;
  /** Returns a value in [0, 1). Defaults to a no-crit deterministic source. */
  rng: () => number;
}

export interface BattleOptions {
  rng?: () => number;
  heroOverrides?: Partial<Pick<Combatant, 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'attack' | 'defense' | 'speed'>>;
}

function initialWait(speed: number): number {
  return COMBAT_CONFIG.timelineBase / speed;
}

export function createBattle(enemyId: EnemyId, options: BattleOptions = {}): BattleState {
  const enemyCfg = ENEMY_CONFIG[enemyId];
  const hero: Combatant = {
    id: HERO_CONFIG.id,
    name: HERO_CONFIG.name,
    hp: HERO_CONFIG.maxHp,
    maxHp: HERO_CONFIG.maxHp,
    mp: HERO_CONFIG.maxMp,
    maxMp: HERO_CONFIG.maxMp,
    attack: HERO_CONFIG.attack,
    defense: HERO_CONFIG.defense,
    speed: HERO_CONFIG.speed,
    critChance: HERO_CONFIG.critChance,
    defending: false,
    wait: initialWait(HERO_CONFIG.speed),
    ...options.heroOverrides,
  };
  if (options.heroOverrides?.speed) hero.wait = initialWait(hero.speed);

  const enemy: Combatant = {
    id: enemyCfg.id,
    name: enemyCfg.name,
    hp: enemyCfg.maxHp,
    maxHp: enemyCfg.maxHp,
    mp: 0,
    maxMp: 0,
    attack: enemyCfg.attack,
    defense: enemyCfg.defense,
    speed: enemyCfg.speed,
    critChance: 0,
    defending: false,
    wait: initialWait(enemyCfg.speed),
  };

  return {
    hero,
    enemy,
    log: [],
    over: false,
    winner: null,
    // Default rng never crits (critChance values are < 1), keeping sims stable.
    rng: options.rng ?? (() => 1),
  };
}

/**
 * Advances the shared timeline to the next actor and returns which side acts.
 * Exact ties resolve to the hero so a first-time player always gets to respond.
 */
export function nextActor(state: BattleState): Side {
  const min = Math.min(state.hero.wait, state.enemy.wait);
  state.hero.wait -= min;
  state.enemy.wait -= min;
  return state.hero.wait <= state.enemy.wait ? 'hero' : 'enemy';
}

function resetWait(c: Combatant): void {
  c.wait = initialWait(c.speed);
}

function dealPhysical(state: BattleState, attacker: Combatant, defender: Combatant): number {
  let damage = Math.max(COMBAT_CONFIG.minHitDamage, attacker.attack - defender.defense);
  if (state.rng() < attacker.critChance) {
    damage = Math.round(damage * 1.5);
    state.log.push(`${attacker.name} lands a critical hit!`);
  }
  if (defender.defending) {
    damage = Math.max(COMBAT_CONFIG.minHitDamage, Math.ceil(damage * COMBAT_CONFIG.defend.damageMultiplier));
    defender.defending = false;
  }
  defender.hp = Math.max(0, defender.hp - damage);
  state.log.push(`${attacker.name} hits ${defender.name} for ${damage}.`);
  return damage;
}

function freezeDamage(enemy: Combatant): number {
  const effectiveDefense = Math.max(0, enemy.defense - COMBAT_CONFIG.freeze.defenseIgnored);
  return Math.max(COMBAT_CONFIG.minHitDamage, COMBAT_CONFIG.freeze.damage - effectiveDefense);
}

export function canFreeze(hero: Combatant): boolean {
  return hero.mp >= COMBAT_CONFIG.freeze.mpCost;
}

function checkOver(state: BattleState): void {
  if (state.enemy.hp <= 0) {
    state.over = true;
    state.winner = 'hero';
  } else if (state.hero.hp <= 0) {
    state.over = true;
    state.winner = 'enemy';
  }
}

/** Resolve the hero's chosen action. Caller guarantees it is the hero's turn. */
export function heroAct(state: BattleState, action: CombatAction): void {
  if (state.over) return;
  const { hero, enemy } = state;
  hero.mp = Math.min(hero.maxMp, hero.mp + COMBAT_CONFIG.mpRegenPerTurn);

  if (action === 'freeze' && canFreeze(hero)) {
    hero.mp -= COMBAT_CONFIG.freeze.mpCost;
    const dmg = freezeDamage(enemy);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.wait += COMBAT_CONFIG.freeze.delay;
    state.log.push(`Chronofreeze hits ${enemy.name} for ${dmg} and stalls its timeline.`);
  } else if (action === 'defend') {
    hero.defending = true;
    state.log.push(`${hero.name} braces for the next blow.`);
  } else {
    // 'attack', or 'freeze' without enough MP, falls back to a physical strike.
    dealPhysical(state, hero, enemy);
  }

  resetWait(hero);
  checkOver(state);
}

/** Resolve the enemy's action (always a physical attack in the prototype). */
export function enemyAct(state: BattleState): void {
  if (state.over) return;
  dealPhysical(state, state.enemy, state.hero);
  resetWait(state.enemy);
  checkOver(state);
}

export type HeroPolicy = (state: BattleState) => CombatAction;

export const attackPolicy: HeroPolicy = () => 'attack';
export const freezePolicy: HeroPolicy = (state) => (canFreeze(state.hero) ? 'freeze' : 'attack');

/** Run a full headless battle under a fixed hero policy. Used by tests. */
export function simulateBattle(
  enemyId: EnemyId,
  policy: HeroPolicy,
  options: BattleOptions = {},
): { winner: Side | null; state: BattleState; rounds: number } {
  const state = createBattle(enemyId, options);
  let guard = 0;
  while (!state.over && guard < 2000) {
    guard += 1;
    const side = nextActor(state);
    if (side === 'hero') heroAct(state, policy(state));
    else enemyAct(state);
  }
  return { winner: state.winner, state, rounds: guard };
}
