import { ENV } from '../config/gameConfig';

// Typed client for the ranked PvP REST API. Shapes mirror the server
// serializers in apps/server/src/pvp/matchmaking.ts and routes/pvp.ts. Ranked
// actions require a SIWS session token (see pvpSession.ts); the leaderboard is
// public.

export type DuelAction = 'attack' | 'freeze' | 'defend';
export type LiveMatchStatus = 'active' | 'complete';
export type EligibilityStatus = 'eligible' | 'ineligible' | 'flagged_review' | 'banned' | 'admin_excluded';

export interface PvpPlayerRef {
  id: string;
  name: string;
}

export interface MatchFighter {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  nextTurn: number;
  defending: boolean;
}

export interface PublicMatchState {
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
  fighters: MatchFighter[];
  winnerId: string | null;
  ratingDelta?: Record<string, number>;
  seed?: number;
  recentLog: string[];
}

export type QueueResult =
  | { status: 'queued'; playerId: string }
  | { status: 'matched'; match: PublicMatchState };

export type ActiveMatchResult = PublicMatchState | { status: 'none' };

export interface EligibilityResult {
  playerId: string;
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  evaluatedAt: string;
}

export interface RankedPlayer {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  updatedAt: string;
}

export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface VerifyResponse {
  ok: boolean;
  wallet: string;
  sessionToken: string;
  expiresAt: string;
}

async function request<T>(path: string, init?: RequestInit, sessionToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.headers) Object.assign(headers, init.headers as Record<string, string>);
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const res = await fetch(`${ENV.apiBaseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data && typeof data.error === 'string' ? data.error : `request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// --- SIWS auth (raw calls; orchestration lives in pvpSession.ts) ---

export function requestNonce(wallet: string): Promise<NonceResponse> {
  return request<NonceResponse>('/auth/nonce', { method: 'POST', body: JSON.stringify({ wallet }) });
}

export function verifySignature(wallet: string, nonce: string, signature: number[] | string): Promise<VerifyResponse> {
  return request<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ wallet, nonce, signature }),
  });
}

// --- Ranked PvP (require a session token) ---

export function queueForPvp(sessionToken: string, name?: string): Promise<QueueResult> {
  return request<QueueResult>('/pvp/queue', { method: 'POST', body: JSON.stringify({ name }) }, sessionToken);
}

export function getActivePvpMatch(sessionToken: string): Promise<ActiveMatchResult> {
  return request<ActiveMatchResult>('/pvp/me/active-match', undefined, sessionToken);
}

export function getMyPvpEligibility(sessionToken: string): Promise<EligibilityResult> {
  return request<EligibilityResult>('/pvp/me/eligibility', undefined, sessionToken);
}

export function getMatchState(sessionToken: string, matchId: string): Promise<PublicMatchState> {
  return request<PublicMatchState>(`/pvp/matches/${matchId}/state`, undefined, sessionToken);
}

export function submitPvpAction(sessionToken: string, matchId: string, action: DuelAction): Promise<PublicMatchState> {
  return request<PublicMatchState>(
    `/pvp/matches/${matchId}/action`,
    { method: 'POST', body: JSON.stringify({ action }) },
    sessionToken,
  );
}

export function forfeitPvpMatch(sessionToken: string, matchId: string): Promise<PublicMatchState> {
  return request<PublicMatchState>(`/pvp/matches/${matchId}/forfeit`, { method: 'POST' }, sessionToken);
}

// --- Public ---

export function getLeaderboard(limit = 10): Promise<RankedPlayer[]> {
  return request<RankedPlayer[]>(`/pvp/leaderboard?limit=${limit}`);
}

/** True when the active-match response indicates a live/finished match (not "none"). */
export function isMatchState(result: ActiveMatchResult): result is PublicMatchState {
  return (result as PublicMatchState).matchId !== undefined;
}
