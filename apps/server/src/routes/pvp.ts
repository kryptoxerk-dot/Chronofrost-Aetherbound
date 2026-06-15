import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAuthSession } from '../auth/session.js';
import { getPvpEligibilityRules, getPvpRateLimitConfig, getPvpSeasonConfig, requirePvpAdminToken } from '../config/env.js';
import { buildPrivacySafeIdentityObservation, eligibility, type FlagSeverity } from '../pvp/eligibility.js';
import { ladder } from '../pvp/ladder.js';
import { matchmaking } from '../pvp/matchmaking.js';
import { getPayoutApprovals } from '../pvp/pvpStorage.js';
import { validateTreasuryPayoutPreflight } from '../pvp/treasuryPayoutPreflight.js';
import { createFixedWindowRateLimiter, createRateLimitWarningLogger, rateLimitKey, type FixedWindowRateLimiter, type RateLimitResult } from '../security/rateLimit.js';

const ActionEnum = z.enum(['attack', 'freeze', 'defend']);
const NameBody = z.object({ name: z.string().min(1).max(40).optional() }).default({});
const MatchParams = z.object({ matchId: z.string().uuid() });
const PlayerParams = z.object({ playerId: z.string().min(3).max(128) });
const LegacyPlayerParams = z.object({ id: z.string().min(3).max(128) });
const SeasonParams = z.object({ seasonId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/) });
const ActionBody = z.object({ action: ActionEnum });
const FlagBody = z.object({
  reason: z.string().min(3).max(240),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  note: z.string().max(1000).optional(),
});
const BanBody = z.object({ reason: z.string().min(3).max(240).default('admin ban') }).default({});
const ClearFlagBody = z.object({ flagId: z.string().uuid().optional() }).default({});
const PayoutRequestParams = z.object({ requestId: z.string().uuid() });
const RejectPayoutBody = z.object({ reason: z.string().min(3).max(240) });
const CancelPayoutBody = z.object({ reason: z.string().min(3).max(240) });
const RecordExecutionBody = z.object({ txSignature: z.string().min(10).max(200) });


const pvpRateLimits = getPvpRateLimitConfig();
const rateLimitWarningLogger = createRateLimitWarningLogger();
const queueLimiter = createFixedWindowRateLimiter({ ...pvpRateLimits.queue, onRepeatedLimit: rateLimitWarningLogger });
const actionLimiter = createFixedWindowRateLimiter({ ...pvpRateLimits.action, onRepeatedLimit: rateLimitWarningLogger });
const adminLimiter = createFixedWindowRateLimiter({ ...pvpRateLimits.admin, onRepeatedLimit: rateLimitWarningLogger });

function sendRateLimitHeaders(reply: FastifyReply, result: RateLimitResult): void {
  reply.header('x-ratelimit-name', result.name);
  reply.header('x-ratelimit-limit', result.limit.toString());
  reply.header('x-ratelimit-remaining', result.remaining.toString());
  reply.header('x-ratelimit-reset', result.resetAt);
}

function enforceRateLimit(reply: FastifyReply, limiter: FixedWindowRateLimiter, key: string): boolean {
  const result = limiter.consume(key);
  sendRateLimitHeaders(reply, result);
  if (!result.allowed) {
    reply.code(429).send({ error: 'rate limit exceeded', retryAfterMs: result.retryAfterMs });
    return false;
  }
  return true;
}

function enforceWalletRateLimit(reply: FastifyReply, limiter: FixedWindowRateLimiter, wallet: string): boolean {
  return enforceRateLimit(reply, limiter, rateLimitKey('wallet', wallet));
}

function adminRateLimitKey(request: FastifyRequest): string {
  const token = getHeaderString(request.headers['x-admin-token']);
  return rateLimitKey('admin', token || request.ip || 'unknown');
}

function requireAuthenticatedWallet(request: FastifyRequest, reply: FastifyReply): string | null {
  const session = getAuthSession(request);
  if (!session) {
    reply.code(401).send({ error: 'authentication required' });
    return null;
  }
  return session.wallet;
}

function displayName(wallet: string, requested?: string): string {
  return requested?.trim() || `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function getHeaderString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function adminActor(request: FastifyRequest): string {
  return getHeaderString(request.headers['x-admin-actor']) || 'admin';
}

function isAdmin(request: FastifyRequest): boolean {
  const token = request.headers['x-admin-token'];
  try {
    const expected = requirePvpAdminToken();
    return typeof token === 'string' && token.length > 0 && token === expected;
  } catch {
    return false;
  }
}

function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!enforceRateLimit(reply, adminLimiter, adminRateLimitKey(request))) return false;
  if (!isAdmin(request)) {
    reply.code(401).send({ error: 'admin authentication required' });
    return false;
  }
  return true;
}

function routeError(reply: FastifyReply, err: unknown) {
  const message = err instanceof Error ? err.message : 'request failed';
  if (message === 'match not found') return reply.code(404).send({ error: message });
  if (message === 'not a match participant') return reply.code(403).send({ error: message });
  if (message === 'not this player turn') return reply.code(409).send({ error: message });
  if (message === 'match already complete') return reply.code(409).send({ error: message });
  if (message === 'turn deadline expired') return reply.code(408).send({ error: message });
  if (message === 'turn not expired') return reply.code(409).send({ error: message });
  if (message === 'season snapshot required before payout planning') return reply.code(409).send({ error: message });
  if (message === 'payout request not found') return reply.code(404).send({ error: message });
  if (message.includes('payout request is')) return reply.code(409).send({ error: message });
  if (message.includes('must be approved')) return reply.code(409).send({ error: message });
  if (message.includes('already executed')) return reply.code(409).send({ error: message });
  return reply.code(400).send({ error: message });
}

function registerAuthenticatedPvpPlayer(request: FastifyRequest, wallet: string, name?: string) {
  const rules = getPvpEligibilityRules();
  const identity = buildPrivacySafeIdentityObservation(
    {
      ip: request.ip,
      deviceFingerprint: getHeaderString(request.headers['x-device-fingerprint']),
      userAgent: getHeaderString(request.headers['user-agent']),
    },
    rules,
  );

  eligibility.registerPlayer({
    playerId: wallet,
    displayName: displayName(wallet, name),
    walletAuthenticated: true,
    identity,
  });
}

function snapshotForSeason(seasonId: string) {
  const rules = { ...getPvpEligibilityRules(), seasonId };
  return eligibility.createSeasonSnapshot(seasonId, rules, { save: true });
}

function payoutPlanForSeason(seasonId: string) {
  const config = { ...getPvpSeasonConfig(), seasonId };
  const snapshot = eligibility.getLatestSnapshot(seasonId) ?? snapshotForSeason(seasonId);
  return eligibility.buildEligiblePayoutPlan(config, snapshot);
}

export async function pvpRoutes(app: FastifyInstance) {
  // Join ranked queue. Player identity comes from the SIWS session only; the
  // client can choose a display name but cannot choose p1/p2 ids.
  app.post('/pvp/queue', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;

    if (!enforceWalletRateLimit(reply, queueLimiter, wallet)) return;

    const body = NameBody.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    const name = displayName(wallet, body.data.name);
    registerAuthenticatedPvpPlayer(request, wallet, name);
    return matchmaking.queuePlayer({ id: wallet, name });
  });

  app.get('/pvp/me/active-match', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;
    registerAuthenticatedPvpPlayer(request, wallet);
    return matchmaking.getActiveMatchForPlayer(wallet) ?? { status: 'none' };
  });

  app.get('/pvp/me/eligibility', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;
    registerAuthenticatedPvpPlayer(request, wallet);
    return eligibility.evaluatePlayer(wallet, getPvpEligibilityRules());
  });

  app.get('/pvp/matches/:matchId/state', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;

    const params = MatchParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid matchId' });

    const state = matchmaking.getMatchForPlayer(params.data.matchId, wallet);
    if (!state) return reply.code(404).send({ error: 'match not found' });
    return state;
  });

  app.post('/pvp/matches/:matchId/action', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;

    if (!enforceWalletRateLimit(reply, actionLimiter, wallet)) return;

    const params = MatchParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid matchId' });
    const body = ActionBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });

    try {
      return matchmaking.submitAction(params.data.matchId, wallet, body.data.action);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/pvp/matches/:matchId/forfeit', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;
    if (!enforceWalletRateLimit(reply, actionLimiter, wallet)) return;

    const params = MatchParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid matchId' });

    try {
      return matchmaking.forfeit(params.data.matchId, wallet);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/pvp/matches/:matchId/claim-timeout', async (request, reply) => {
    const wallet = requireAuthenticatedWallet(request, reply);
    if (!wallet) return;
    if (!enforceWalletRateLimit(reply, actionLimiter, wallet)) return;

    const params = MatchParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid matchId' });

    try {
      return matchmaking.claimTimeout(params.data.matchId, wallet);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  // Verify a completed combat match by deterministic replay (anti-cheat / disputes).
  app.get('/pvp/matches/:matchId/verify', async (request, reply) => {
    const params = MatchParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid matchId' });
    const result = ladder.verifyMatch(params.data.matchId);
    if (!result.ok) return reply.code(409).send(result);
    return result;
  });

  app.get('/pvp/leaderboard', async (request) => {
    const q = z.object({ limit: z.coerce.number().min(1).max(100).optional() }).safeParse(request.query);
    const limit = q.success ? q.data.limit ?? 50 : 50;
    return ladder.leaderboard(limit);
  });

  app.get('/pvp/player/:id', async (request, reply) => {
    const params = LegacyPlayerParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid id' });
    const p = ladder.getPlayer(params.data.id);
    if (!p) return reply.code(404).send({ error: 'player not ranked yet' });
    return p;
  });

  app.get('/admin/pvp/season/:seasonId/eligibility-report', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = SeasonParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid seasonId' });
    const rules = { ...getPvpEligibilityRules(), seasonId: params.data.seasonId };
    return eligibility.createSeasonSnapshot(params.data.seasonId, rules, { save: false });
  });

  app.post('/admin/pvp/season/:seasonId/snapshot', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = SeasonParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid seasonId' });
    return snapshotForSeason(params.data.seasonId);
  });

  app.post('/admin/pvp/players/:playerId/flag', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PlayerParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid playerId' });
    const body = FlagBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    const flag = eligibility.flagPlayer(
      params.data.playerId,
      body.data.reason,
      body.data.severity as FlagSeverity,
      adminActor(request),
      body.data.note,
    );
    return { ok: true, flag };
  });

  app.post('/admin/pvp/players/:playerId/ban', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PlayerParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid playerId' });
    const body = BanBody.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    return eligibility.banPlayer(params.data.playerId, adminActor(request), body.data.reason);
  });

  app.post('/admin/pvp/players/:playerId/clear-flag', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PlayerParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid playerId' });
    const body = ClearFlagBody.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    return eligibility.clearFlag(params.data.playerId, body.data.flagId, adminActor(request));
  });

  // Admin-only, config-backed payout plan. Public callers cannot submit
  // prizePoolRaw/distribution, and flagged/ineligible accounts are excluded.
  app.post('/admin/pvp/season/payout-plan', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      return payoutPlanForSeason(getPvpSeasonConfig().seasonId);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/admin/pvp/season/:seasonId/payout-plan', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = SeasonParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid seasonId' });

    try {
      return payoutPlanForSeason(params.data.seasonId);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  // Creates an approval request from the eligibility-filtered payout plan. This
  // still does not execute token transfers; it only creates the review record.
  app.post('/admin/pvp/season/:seasonId/payout-approval-request', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = SeasonParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid seasonId' });

    try {
      const plan = payoutPlanForSeason(params.data.seasonId);
      return await getPayoutApprovals().create(plan, adminActor(request));
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.get('/admin/pvp/payout-requests', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const q = z.object({ seasonId: z.string().min(1).max(80).optional() }).safeParse(request.query);
    return await getPayoutApprovals().list(q.success ? q.data.seasonId : undefined);
  });

  app.get('/admin/pvp/payout-requests/:requestId', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    const found = await getPayoutApprovals().get(params.data.requestId);
    if (!found) return reply.code(404).send({ error: 'payout request not found' });
    return found;
  });

  app.post('/admin/pvp/payout-requests/:requestId/approve', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    try {
      return await getPayoutApprovals().approve(params.data.requestId, adminActor(request));
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/admin/pvp/payout-requests/:requestId/reject', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    const body = RejectPayoutBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    try {
      return await getPayoutApprovals().reject(params.data.requestId, adminActor(request), body.data.reason);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/admin/pvp/payout-requests/:requestId/cancel', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    const body = CancelPayoutBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    try {
      return await getPayoutApprovals().cancel(params.data.requestId, adminActor(request), body.data.reason);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.get('/admin/pvp/payout-requests/:requestId/preflight', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    const found = await getPayoutApprovals().get(params.data.requestId);
    if (!found) return reply.code(404).send({ error: 'payout request not found' });
    try {
      return validateTreasuryPayoutPreflight(found);
    } catch (err) {
      return routeError(reply, err);
    }
  });

  app.post('/admin/pvp/payout-requests/:requestId/record-execution', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = PayoutRequestParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid requestId' });
    const body = RecordExecutionBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid body' });
    try {
      const found = await getPayoutApprovals().get(params.data.requestId);
      if (!found) return reply.code(404).send({ error: 'payout request not found' });
      validateTreasuryPayoutPreflight(found);
      return await getPayoutApprovals().attachExecutionSignature(params.data.requestId, body.data.txSignature, adminActor(request));
    } catch (err) {
      return routeError(reply, err);
    }
  });
}
