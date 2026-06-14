// Deterministic, server-authoritative duel engine.
//
// PvP rule: browsers submit intended actions only. The server owns the seed,
// turn clock, RNG state, HP, timeline, and final result. The same seed + same
// action log must replay to the same winner, which is how disputes are verified.

export type DuelAction = 'attack' | 'freeze' | 'defend';
export type DuelStatus = 'active' | 'complete';

export type Fighter = {
  id: string;          // wallet/session-bound player id
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  nextTurn: number;
  defending: boolean;
};

export type DuelConfig = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
};

// Ranked PvP is equalized. Wallet inventory/cosmetics must never change these
// stats, otherwise the ladder becomes pay-to-win.
export const RANKED_FIGHTER: DuelConfig = {
  hp: 40,
  attack: 7,
  defense: 3,
  speed: 8,
};

export type DuelState = {
  seed: number;
  rngState: number;
  time: number;
  turns: number;
  maxTurns: number;
  p1Id: string;
  p2Id: string;
  tieBreakerId: string;
  fighters: {
    p1: Fighter;
    p2: Fighter;
  };
  status: DuelStatus;
  winnerId: string | null;
  log: string[];
};

export type DuelResult = {
  winnerId: string | null; // null = draw
  turns: number;
  finalHp: Record<string, number>;
  log: string[];
};

const RNG_INCREMENT = 0x6d2b79f5;

function nextRandomFromState(state: { rngState: number }): number {
  state.rngState = (state.rngState + RNG_INCREMENT) >>> 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// --- deterministic RNG: same seed => same sequence everywhere ---
export function makeRng(seed: number): () => number {
  const state = { rngState: seed >>> 0 };
  return () => nextRandomFromState(state);
}

function mkFighter(id: string, name: string, c: DuelConfig, firstTurn: number): Fighter {
  return {
    id,
    name,
    hp: c.hp,
    maxHp: c.hp,
    attack: c.attack,
    defense: c.defense,
    speed: c.speed,
    nextTurn: firstTurn,
    defending: false,
  };
}

function turnDelay(speed: number): number {
  return Math.max(12, 70 - speed * 5);
}

function computeDamage(att: Fighter, def: Fighter, mod: number, state: DuelState): number {
  const base = Math.floor(att.attack * mod) - Math.floor(def.defense * 0.65);
  const variance = 1 + (nextRandomFromState(state) * 0.2 - 0.1); // ±10%
  const crit = nextRandomFromState(state) < 0.08 ? 1.5 : 1;
  const undefended = Math.max(1, Math.round(base * variance * crit));
  return def.defending ? Math.max(1, Math.floor(undefended * 0.5)) : undefended;
}

function getSlotForId(state: DuelState, playerId: string): 'p1' | 'p2' | null {
  if (state.p1Id === playerId) return 'p1';
  if (state.p2Id === playerId) return 'p2';
  return null;
}

function finishIfNeeded(state: DuelState): void {
  const f1 = state.fighters.p1;
  const f2 = state.fighters.p2;

  if (f1.hp <= 0 && f2.hp <= 0) state.winnerId = null;
  else if (f2.hp <= 0) state.winnerId = f1.id;
  else if (f1.hp <= 0) state.winnerId = f2.id;
  else if (state.turns >= state.maxTurns) {
    state.winnerId = f1.hp === f2.hp ? null : f1.hp > f2.hp ? f1.id : f2.id;
  } else {
    return;
  }

  state.status = 'complete';
}

export function createDuelState(params: {
  seed: number;
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  config?: DuelConfig;
  maxTurns?: number;
}): DuelState {
  if (params.p1.id === params.p2.id) throw new Error('duel requires two distinct players');

  const cfg = params.config ?? RANKED_FIGHTER;
  const stateForInitiative = { rngState: params.seed >>> 0 };
  const tieBreakerId = nextRandomFromState(stateForInitiative) < 0.5 ? params.p1.id : params.p2.id;

  // The first acting player is seed-selected by the server, not caller-selected.
  // This removes the old hardcoded p1 initiative advantage from ranked PvP.
  const p1FirstTurn = tieBreakerId === params.p1.id ? 0 : 4;
  const p2FirstTurn = tieBreakerId === params.p2.id ? 0 : 4;

  return {
    seed: params.seed >>> 0,
    rngState: stateForInitiative.rngState,
    time: 0,
    turns: 0,
    maxTurns: params.maxTurns ?? 200,
    p1Id: params.p1.id,
    p2Id: params.p2.id,
    tieBreakerId,
    fighters: {
      p1: mkFighter(params.p1.id, params.p1.name, cfg, p1FirstTurn),
      p2: mkFighter(params.p2.id, params.p2.name, cfg, p2FirstTurn),
    },
    status: 'active',
    winnerId: null,
    log: [],
  };
}

export function getCurrentActorId(state: DuelState): string | null {
  if (state.status === 'complete') return null;
  const f1 = state.fighters.p1;
  const f2 = state.fighters.p2;
  if (f1.nextTurn < f2.nextTurn) return f1.id;
  if (f2.nextTurn < f1.nextTurn) return f2.id;
  return state.tieBreakerId;
}

export function getOpponentId(state: DuelState, playerId: string): string | null {
  if (state.p1Id === playerId) return state.p2Id;
  if (state.p2Id === playerId) return state.p1Id;
  return null;
}

export function applyDuelAction(state: DuelState, playerId: string, action: DuelAction): DuelState {
  if (state.status === 'complete') return state;

  const expectedActorId = getCurrentActorId(state);
  if (expectedActorId !== playerId) {
    throw new Error('not this player turn');
  }

  const actorSlot = getSlotForId(state, playerId);
  if (!actorSlot) throw new Error('player is not in duel');
  const targetSlot = actorSlot === 'p1' ? 'p2' : 'p1';
  const actor = state.fighters[actorSlot];
  const target = state.fighters[targetSlot];

  state.time = Math.max(state.time, actor.nextTurn);
  state.turns += 1;

  if (action === 'attack') {
    const d = computeDamage(actor, target, 1, state);
    const guarded = target.defending;
    target.hp = Math.max(0, target.hp - d);
    if (guarded) {
      // Guard is a real defensive choice in PvP, not a skipped turn: it halves
      // the hit and punishes predictable attack spam with a small riposte.
      const counter = Math.max(1, Math.floor(target.attack * 0.85));
      actor.hp = Math.max(0, actor.hp - counter);
      state.log.push(`${target.name} ripostes for ${counter}.`);
    }
    target.defending = false;
    actor.defending = false;
    actor.nextTurn = state.time + turnDelay(actor.speed);
    state.log.push(`${actor.name} attacks for ${d}${guarded ? ' through guard' : ''}.`);
  } else if (action === 'freeze') {
    // Freeze is tactical, not spammable: lower damage, longer self-recovery, and
    // guard sharply reduces its delay. This prevents freeze from dominating every
    // simple strategy while preserving the Chronofrost identity.
    const guarded = target.defending;
    const d = computeDamage(actor, target, 0.35, state);
    target.hp = Math.max(0, target.hp - d);
    target.nextTurn += guarded ? 6 : 16;
    target.defending = false;
    actor.defending = false;
    actor.nextTurn = state.time + turnDelay(actor.speed) + 12;
    state.log.push(`${actor.name} freezes for ${d} and delays ${target.name}${guarded ? ' lightly through guard' : ''}.`);
  } else {
    actor.defending = true;
    actor.nextTurn = state.time + Math.floor(turnDelay(actor.speed) * 0.65);
    state.log.push(`${actor.name} defends.`);
  }

  finishIfNeeded(state);
  if (state.log.length > 50) state.log = state.log.slice(-50);
  return state;
}

/**
 * Resolve a full duel deterministically from full action queues. This is mainly
 * used for tests, replay verification, and completed-match audit checks. Live
 * PvP should use createDuelState + applyDuelAction turn by turn.
 */
export function resolveDuel(params: {
  seed: number;
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  actions1: DuelAction[];
  actions2: DuelAction[];
  config?: DuelConfig;
  maxTurns?: number;
}): DuelResult {
  const state = createDuelState({
    seed: params.seed,
    p1: params.p1,
    p2: params.p2,
    config: params.config,
    maxTurns: params.maxTurns,
  });

  const actionQueues = new Map<string, DuelAction[]>([
    [params.p1.id, [...params.actions1]],
    [params.p2.id, [...params.actions2]],
  ]);

  while (state.status === 'active') {
    const actorId = getCurrentActorId(state);
    if (!actorId) break;
    const action = actionQueues.get(actorId)?.shift() ?? 'attack';
    applyDuelAction(state, actorId, action);
  }

  return {
    winnerId: state.winnerId,
    turns: state.turns,
    finalHp: {
      [state.fighters.p1.id]: state.fighters.p1.hp,
      [state.fighters.p2.id]: state.fighters.p2.hp,
    },
    log: state.log.slice(-12),
  };
}
