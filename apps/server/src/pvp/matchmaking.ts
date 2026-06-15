import crypto from 'node:crypto';
import {
  applyDuelAction,
  createDuelState,
  getCurrentActorId,
  getOpponentId,
  type DuelAction,
  type DuelState,
} from './duelEngine.js';
import { ladder, type MatchRecord, type RankedPlayer } from './ladder.js';
import { persistCompletedMatch } from './pvpPersistence.js';

export type PvpPlayerRef = {
  id: string;
  name: string;
};

export type LiveMatchStatus = 'active' | 'complete';

export type LiveMatch = {
  matchId: string;
  status: LiveMatchStatus;
  seed: number;
  p1: PvpPlayerRef;
  p2: PvpPlayerRef;
  duel: DuelState;
  actionsByPlayer: Record<string, DuelAction[]>;
  createdAt: string;
  updatedAt: string;
  turnDeadlineAt: string;
  winnerId: string | null;
  ratingDelta?: Record<string, number>;
  completionReason?: 'combat' | 'forfeit' | 'timeout';
};

export type PublicMatchState = {
  matchId: string;
  status: LiveMatchStatus;
  p1: PvpPlayerRef;
  p2: PvpPlayerRef;
  viewerId: string;
  currentTurnPlayerId: string | null;
  yourTurn: boolean;
  turnDeadlineAt: string | null;
  turns: number;
  time: number;
  fighters: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    nextTurn: number;
    defending: boolean;
  }>;
  winnerId: string | null;
  ratingDelta?: Record<string, number>;
  seed?: number; // exposed only after match completion for audit/replay
  recentLog: string[];
};

const TURN_TIMEOUT_MS = 45_000;
const waitingQueue = new Map<string, PvpPlayerRef>();
const matches = new Map<string, LiveMatch>();
const activeMatchByPlayer = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function deadlineIso(): string {
  return new Date(Date.now() + TURN_TIMEOUT_MS).toISOString();
}

function serverSeed(): number {
  return crypto.randomBytes(4).readUInt32BE(0);
}

function randomizeSides(a: PvpPlayerRef, b: PvpPlayerRef): { p1: PvpPlayerRef; p2: PvpPlayerRef } {
  return crypto.randomInt(2) === 0 ? { p1: a, p2: b } : { p1: b, p2: a };
}

function getParticipant(match: LiveMatch, playerId: string): PvpPlayerRef | null {
  if (match.p1.id === playerId) return match.p1;
  if (match.p2.id === playerId) return match.p2;
  return null;
}

function clonePublicState(match: LiveMatch, viewerId: string): PublicMatchState {
  const currentTurnPlayerId = match.status === 'active' ? getCurrentActorId(match.duel) : null;
  return {
    matchId: match.matchId,
    status: match.status,
    p1: { ...match.p1 },
    p2: { ...match.p2 },
    viewerId,
    currentTurnPlayerId,
    yourTurn: currentTurnPlayerId === viewerId,
    turnDeadlineAt: match.status === 'active' ? match.turnDeadlineAt : null,
    turns: match.duel.turns,
    time: match.duel.time,
    fighters: [match.duel.fighters.p1, match.duel.fighters.p2].map((f) => ({
      id: f.id,
      name: f.name,
      hp: f.hp,
      maxHp: f.maxHp,
      nextTurn: f.nextTurn,
      defending: f.defending,
    })),
    winnerId: match.winnerId,
    ratingDelta: match.ratingDelta ? { ...match.ratingDelta } : undefined,
    seed: match.status === 'complete' ? match.seed : undefined,
    recentLog: match.duel.log.slice(-8),
  };
}

function completeMatch(match: LiveMatch, reason: 'combat' | 'forfeit' | 'timeout', winnerId: string | null): MatchRecord {
  if (match.status === 'complete' && match.ratingDelta) {
    const existing = ladder.getMatch(match.matchId);
    if (!existing) throw new Error('completed match missing ladder record');
    return existing;
  }

  match.status = 'complete';
  match.winnerId = winnerId;
  match.completionReason = reason;
  match.updatedAt = nowIso();
  match.duel.status = 'complete';
  match.duel.winnerId = winnerId;

  const record = ladder.recordResolvedMatch({
    matchId: match.matchId,
    seed: match.seed,
    p1: match.p1,
    p2: match.p2,
    actions1: [...(match.actionsByPlayer[match.p1.id] ?? [])],
    actions2: [...(match.actionsByPlayer[match.p2.id] ?? [])],
    winnerId,
    completionReason: reason,
    finalHp: {
      [match.duel.fighters.p1.id]: match.duel.fighters.p1.hp,
      [match.duel.fighters.p2.id]: match.duel.fighters.p2.hp,
    },
  });

  match.ratingDelta = { ...record.ratingDelta };
  activeMatchByPlayer.delete(match.p1.id);
  activeMatchByPlayer.delete(match.p2.id);

  // Durable write-through (fire-and-forget). The ladder already updated live
  // ratings above; this persists the authoritative post-match state.
  const persistPlayers = [ladder.getPlayer(match.p1.id), ladder.getPlayer(match.p2.id)].filter(
    (p): p is RankedPlayer => Boolean(p),
  );
  persistCompletedMatch(record, persistPlayers);

  return record;
}

function createMatch(a: PvpPlayerRef, b: PvpPlayerRef, forcedSeed?: number, forcedSides?: { p1: PvpPlayerRef; p2: PvpPlayerRef }): LiveMatch {
  if (a.id === b.id) throw new Error('cannot match player against self');
  const seed = forcedSeed ?? serverSeed();
  const { p1, p2 } = forcedSides ?? randomizeSides(a, b);
  const duel = createDuelState({ seed, p1, p2 });
  const match: LiveMatch = {
    matchId: crypto.randomUUID(),
    status: 'active',
    seed,
    p1,
    p2,
    duel,
    actionsByPlayer: { [p1.id]: [], [p2.id]: [] },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    turnDeadlineAt: deadlineIso(),
    winnerId: null,
  };
  matches.set(match.matchId, match);
  activeMatchByPlayer.set(p1.id, match.matchId);
  activeMatchByPlayer.set(p2.id, match.matchId);
  ladder.ensurePlayer(p1.id, p1.name);
  ladder.ensurePlayer(p2.id, p2.name);
  return match;
}

export const matchmaking = {
  queuePlayer(player: PvpPlayerRef): { status: 'queued'; playerId: string } | { status: 'matched'; match: PublicMatchState } {
    if (activeMatchByPlayer.has(player.id)) {
      const match = matches.get(activeMatchByPlayer.get(player.id)!);
      if (match) return { status: 'matched', match: clonePublicState(match, player.id) };
      activeMatchByPlayer.delete(player.id);
    }

    waitingQueue.delete(player.id);
    const opponent = [...waitingQueue.values()].find((p) => p.id !== player.id);
    if (!opponent) {
      waitingQueue.set(player.id, { ...player });
      ladder.ensurePlayer(player.id, player.name);
      return { status: 'queued', playerId: player.id };
    }

    waitingQueue.delete(opponent.id);
    const match = createMatch(opponent, player);
    return { status: 'matched', match: clonePublicState(match, player.id) };
  },

  getActiveMatchForPlayer(playerId: string): PublicMatchState | null {
    const matchId = activeMatchByPlayer.get(playerId);
    if (!matchId) return null;
    const match = matches.get(matchId);
    if (!match) {
      activeMatchByPlayer.delete(playerId);
      return null;
    }
    return clonePublicState(match, playerId);
  },

  getMatchForPlayer(matchId: string, playerId: string): PublicMatchState | null {
    const match = matches.get(matchId);
    if (!match || !getParticipant(match, playerId)) return null;
    return clonePublicState(match, playerId);
  },

  submitAction(matchId: string, playerId: string, action: DuelAction): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, playerId)) throw new Error('not a match participant');
    if (match.status === 'complete') throw new Error('match already complete');

    const deadlineMs = Date.parse(match.turnDeadlineAt);
    if (Number.isFinite(deadlineMs) && deadlineMs < Date.now()) throw new Error('turn deadline expired');

    const currentActorId = getCurrentActorId(match.duel);
    if (currentActorId !== playerId) throw new Error('not this player turn');

    match.actionsByPlayer[playerId] = match.actionsByPlayer[playerId] ?? [];
    match.actionsByPlayer[playerId].push(action);
    applyDuelAction(match.duel, playerId, action);
    match.updatedAt = nowIso();

    if (match.duel.status === 'complete') {
      completeMatch(match, 'combat', match.duel.winnerId);
    } else {
      match.turnDeadlineAt = deadlineIso();
    }

    return clonePublicState(match, playerId);
  },

  forfeit(matchId: string, playerId: string): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, playerId)) throw new Error('not a match participant');
    if (match.status === 'complete') return clonePublicState(match, playerId);

    const opponentId = getOpponentId(match.duel, playerId);
    completeMatch(match, 'forfeit', opponentId);
    return clonePublicState(match, playerId);
  },

  claimTimeout(matchId: string, requesterId: string): PublicMatchState {
    const match = matches.get(matchId);
    if (!match) throw new Error('match not found');
    if (!getParticipant(match, requesterId)) throw new Error('not a match participant');
    if (match.status === 'complete') return clonePublicState(match, requesterId);

    const deadlineMs = Date.parse(match.turnDeadlineAt);
    if (!Number.isFinite(deadlineMs) || deadlineMs >= Date.now()) throw new Error('turn not expired');

    const latePlayerId = getCurrentActorId(match.duel);
    const winnerId = latePlayerId ? getOpponentId(match.duel, latePlayerId) : null;
    completeMatch(match, 'timeout', winnerId);
    return clonePublicState(match, requesterId);
  },

  _createMatchForTests(a: PvpPlayerRef, b: PvpPlayerRef, seed = 1, forcedSides?: { p1: PvpPlayerRef; p2: PvpPlayerRef }): LiveMatch {
    return createMatch(a, b, seed, forcedSides);
  },

  _getRawMatch(matchId: string): LiveMatch | undefined {
    return matches.get(matchId);
  },

  _reset() {
    waitingQueue.clear();
    matches.clear();
    activeMatchByPlayer.clear();
  },
};
