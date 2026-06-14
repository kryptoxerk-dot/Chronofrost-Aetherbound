import { eligibility } from '../eligibility.js';
import { ladder, type MatchRecord, type RankedPlayer } from '../ladder.js';
import type { PvpRepositories } from '../repositories.js';
import type { EligibilityEvaluation, EligibilityProfile, PlayerFlag, SeasonSnapshot } from '../eligibility.js';

const shadowMatches = new Map<string, MatchRecord>();
const savedEvaluations = new Map<string, EligibilityEvaluation>();
const payoutPlans = new Map<string, unknown>();

function cloneMatch(record: MatchRecord): MatchRecord {
  return {
    ...record,
    actions1: [...record.actions1],
    actions2: [...record.actions2],
    ratingDelta: { ...record.ratingDelta },
    finalHp: record.finalHp ? { ...record.finalHp } : undefined,
  };
}

/**
 * Dev adapter for future repository-injected services.
 *
 * Existing code still uses ladder/eligibility singletons directly. New code
 * should depend on this repository bundle shape so the Postgres adapter can be
 * dropped in without rewriting business logic.
 */
export function createMemoryPvpRepositories(): PvpRepositories {
  return {
    players: {
      async upsertRankedPlayer(player: RankedPlayer): Promise<RankedPlayer> {
        return ladder.ensurePlayer(player.id, player.name);
      },
      async getRankedPlayer(playerId: string): Promise<RankedPlayer | null> {
        return ladder.getPlayer(playerId) ?? null;
      },
      async listRankedPlayers(limit: number): Promise<RankedPlayer[]> {
        return ladder.leaderboard(limit);
      },
    },
    matches: {
      async insertMatch(record: MatchRecord): Promise<MatchRecord> {
        shadowMatches.set(record.matchId, cloneMatch(record));
        return cloneMatch(record);
      },
      async getMatch(matchId: string): Promise<MatchRecord | null> {
        const fromLadder = ladder.getMatch(matchId);
        const fromShadow = shadowMatches.get(matchId);
        return fromLadder ?? (fromShadow ? cloneMatch(fromShadow) : null);
      },
      async listMatchesForPlayer(playerId: string, seasonId?: string): Promise<MatchRecord[]> {
        void seasonId;
        return ladder.listMatches().filter((m) => m.p1Id === playerId || m.p2Id === playerId);
      },
      async listSeasonMatches(seasonId: string): Promise<MatchRecord[]> {
        void seasonId;
        return ladder.listMatches();
      },
    },
    eligibility: {
      async upsertProfile(profile: EligibilityProfile): Promise<EligibilityProfile> {
        return eligibility.registerPlayer({
          playerId: profile.playerId,
          displayName: profile.displayName,
          walletAuthenticated: profile.walletAuthenticated,
          observedAt: profile.lastSeenAt,
        });
      },
      async getProfile(playerId: string): Promise<EligibilityProfile | null> {
        return eligibility.getProfile(playerId) ?? null;
      },
      async insertFlag(playerId: string, flag: PlayerFlag): Promise<PlayerFlag> {
        return eligibility.flagPlayer(playerId, flag.reason, flag.severity, flag.createdBy, flag.note);
      },
      async clearFlag(playerId: string, flagId: string | null, clearedBy: string): Promise<void> {
        eligibility.clearFlag(playerId, flagId ?? undefined, clearedBy);
      },
      async saveEvaluation(seasonId: string, evaluation: EligibilityEvaluation): Promise<void> {
        savedEvaluations.set(`${seasonId}:${evaluation.playerId}`, { ...evaluation });
      },
    },
    seasons: {
      async saveSnapshot(snapshot: SeasonSnapshot): Promise<SeasonSnapshot> {
        return {
          ...snapshot,
          rulesSummary: { ...snapshot.rulesSummary },
          rows: snapshot.rows.map((row) => ({ ...row, reasons: [...row.reasons], warnings: [...row.warnings], stats: { ...row.stats } })),
          eligiblePlayers: snapshot.eligiblePlayers.map((player) => ({ ...player })),
        };
      },
      async getLatestSnapshot(seasonId: string): Promise<SeasonSnapshot | null> {
        return eligibility.getLatestSnapshot(seasonId) ?? null;
      },
      async savePayoutPlan(seasonId: string, payoutPlanJson: unknown, createdBy: string): Promise<void> {
        payoutPlans.set(seasonId, { payoutPlanJson, createdBy, createdAt: new Date().toISOString() });
      },
    },
  };
}
