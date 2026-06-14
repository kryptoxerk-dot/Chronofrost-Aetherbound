import type { MatchRecord, RankedPlayer } from './ladder.js';
import type { EligibilityEvaluation, EligibilityProfile, PlayerFlag, SeasonSnapshot } from './eligibility.js';

/**
 * Repository contracts for the production Postgres adapter.
 *
 * The current package intentionally keeps an in-memory implementation for local
 * development/tests, but ranked seasons with real $AETHER prizes must back these
 * contracts with durable Postgres tables from resources/pvp_database_schema.sql.
 */
export interface PvpPlayerRepository {
  upsertRankedPlayer(player: RankedPlayer): Promise<RankedPlayer>;
  getRankedPlayer(playerId: string): Promise<RankedPlayer | null>;
  listRankedPlayers(limit: number): Promise<RankedPlayer[]>;
}

export interface PvpMatchRepository {
  insertMatch(record: MatchRecord): Promise<MatchRecord>;
  getMatch(matchId: string): Promise<MatchRecord | null>;
  listMatchesForPlayer(playerId: string, seasonId?: string): Promise<MatchRecord[]>;
  listSeasonMatches(seasonId: string): Promise<MatchRecord[]>;
}

export interface PvpEligibilityRepository {
  upsertProfile(profile: EligibilityProfile): Promise<EligibilityProfile>;
  getProfile(playerId: string): Promise<EligibilityProfile | null>;
  insertFlag(playerId: string, flag: PlayerFlag): Promise<PlayerFlag>;
  clearFlag(playerId: string, flagId: string | null, clearedBy: string): Promise<void>;
  saveEvaluation(seasonId: string, evaluation: EligibilityEvaluation): Promise<void>;
}

export interface PvpSeasonRepository {
  saveSnapshot(snapshot: SeasonSnapshot): Promise<SeasonSnapshot>;
  getLatestSnapshot(seasonId: string): Promise<SeasonSnapshot | null>;
  savePayoutPlan(seasonId: string, payoutPlanJson: unknown, createdBy: string): Promise<void>;
}

export type PvpRepositories = {
  players: PvpPlayerRepository;
  matches: PvpMatchRepository;
  eligibility: PvpEligibilityRepository;
  seasons: PvpSeasonRepository;
};
