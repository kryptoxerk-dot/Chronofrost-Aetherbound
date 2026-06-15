// Off-chain, client-authoritative game progress for the prototype. Survives
// reloads via localStorage but degrades gracefully in private mode / Node tests
// where storage may be missing or throw.

export interface GameState {
  gold: number;
  xp: number;
  level: number;
  hp: number;
  mp: number;
  inventory: string[];
  questAccepted: boolean;
  questComplete: boolean;
  bossDefeated: boolean;
  walletAddress: string | null;
  aetherBalanceUi: string | null;
}

export interface RewardInput {
  gold?: number;
  xp?: number;
}

const STORAGE_KEY = 'chronofrost.save.v1';

function defaultState(): GameState {
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
    walletAddress: null,
    aetherBalanceUi: null,
  };
}

/** XP needed to advance FROM the given level to the next one. */
export function xpForNextLevel(level: number): number {
  return 20 + (level - 1) * 15;
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Touch it once; some privacy modes throw only on access.
    const probe = '__chronofrost_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function load(): GameState {
  const storage = safeStorage();
  if (!storage) return defaultState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...defaultState(), ...parsed, inventory: [...(parsed.inventory ?? [])] };
  } catch {
    return defaultState();
  }
}

let state: GameState = load();

function persist(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full / blocked — gameplay continues in memory only.
  }
}

/** Returns a defensive copy so callers cannot mutate internal state directly. */
export function getGameState(): GameState {
  return { ...state, inventory: [...state.inventory] };
}

export function updateGameState(patch: Partial<GameState>): GameState {
  state = { ...state, ...patch, inventory: patch.inventory ? [...patch.inventory] : state.inventory };
  persist();
  return getGameState();
}

export function resetGameState(): GameState {
  state = defaultState();
  persist();
  return getGameState();
}

/** Apply gold/xp and resolve any level-ups. Safe to call without a wallet. */
export function addReward(reward: RewardInput): { leveledUp: boolean; level: number } {
  const gold = Number.isFinite(reward.gold) ? Math.max(0, Math.floor(reward.gold as number)) : 0;
  const xp = Number.isFinite(reward.xp) ? Math.max(0, Math.floor(reward.xp as number)) : 0;

  state.gold += gold;
  state.xp += xp;

  let leveledUp = false;
  while (state.xp >= xpForNextLevel(state.level)) {
    state.xp -= xpForNextLevel(state.level);
    state.level += 1;
    leveledUp = true;
  }
  persist();
  return { leveledUp, level: state.level };
}

/** Spend gold. Rejects NaN, infinite, non-positive, and unaffordable amounts. */
export function spendGold(amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const cost = Math.floor(amount);
  if (cost > state.gold) return false;
  state.gold -= cost;
  persist();
  return true;
}

/** Grant an item once. Returns false if it was already owned. */
export function grantInventory(itemId: string): boolean {
  if (!itemId || state.inventory.includes(itemId)) return false;
  state.inventory.push(itemId);
  persist();
  return true;
}

export function hasItem(itemId: string): boolean {
  return state.inventory.includes(itemId);
}

export function healHero(hpAmount: number, mpAmount: number, maxHp = 32, maxMp = 10): GameState {
  const hp = Number.isFinite(hpAmount) ? Math.max(0, Math.floor(hpAmount)) : 0;
  const mp = Number.isFinite(mpAmount) ? Math.max(0, Math.floor(mpAmount)) : 0;
  state.hp = Math.min(maxHp, state.hp + hp);
  state.mp = Math.min(maxMp, state.mp + mp);
  persist();
  return getGameState();
}

export function setHeroVitals(hp: number, mp: number): GameState {
  state.hp = Math.max(0, Math.floor(hp));
  state.mp = Math.max(0, Math.floor(mp));
  persist();
  return getGameState();
}
