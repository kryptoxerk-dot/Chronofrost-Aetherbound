import crypto from 'node:crypto';
import type { PvpRepositories } from '../repositories.js';
import type { MatchRecord, RankedPlayer } from '../ladder.js';
import type { DuelAction } from '../duelEngine.js';
import type {
  EligibilityEvaluation,
  EligibilityProfile,
  IdentityObservation,
  PlayerFlag,
  SeasonSnapshot,
} from '../eligibility.js';

/**
 * Postgres adapter for the PvP repositories.
 *
 * This implementation is intentionally decoupled from any specific driver: it
 * talks to a minimal {@link SqlClient} seam (parameterized `query`, optional
 * pooled `connect` for transactions). Wire it with node-postgres in production:
 *
 *   const pool = new Pool({ connectionString: env.DATABASE_URL });
 *   const repos = createPostgresPvpRepositories(pool);
 *
 * All statements map onto resources/pvp_database_schema.sql. Multi-row writes
 * (a resolved match + its action log + rating updates) run inside a single
 * transaction so a partial failure never leaves the ladder inconsistent.
 */

export type SqlQueryResult<T = unknown> = { rows: T[] };

export interface Queryable {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<SqlQueryResult<T>>;
}

export interface PooledClient extends Queryable {
  release(): void;
}

export interface SqlClient extends Queryable {
  /**
   * Optional pooled-connection acquire (node-postgres `Pool.connect`). When
   * present, transactions run on a single dedicated connection. When absent
   * (e.g. a single-connection test double), transactions fall back to issuing
   * BEGIN/COMMIT/ROLLBACK on the shared client.
   */
  connect?(): Promise<PooledClient>;
}

async function transact<T>(client: SqlClient, fn: (tx: Queryable) => Promise<T>): Promise<T> {
  if (client.connect) {
    const tx = await client.connect();
    try {
      await tx.query('BEGIN');
      const result = await fn(tx);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await tx.query('ROLLBACK');
      } catch {
        /* surface the original error, not the rollback failure */
      }
      throw error;
    } finally {
      tx.release();
    }
  }

  await client.query('BEGIN');
  try {
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* preserve original error */
    }
    throw error;
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function toBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 't';
}

// ---------------------------------------------------------------------------
// Row shapes (snake_case, straight from Postgres) + mappers to domain types.
// ---------------------------------------------------------------------------

interface PlayerRow {
  player_id: string;
  display_name: string;
  rating: number | string;
  wins: number | string;
  losses: number | string;
  draws: number | string;
  wallet_authenticated?: unknown;
  eligibility_status?: string;
  admin_excluded?: unknown;
  banned?: unknown;
  first_seen_at?: unknown;
  last_seen_at?: unknown;
  updated_at: unknown;
}

function rowToRankedPlayer(row: PlayerRow): RankedPlayer {
  return {
    id: row.player_id,
    name: row.display_name,
    rating: toNumber(row.rating),
    wins: toNumber(row.wins),
    losses: toNumber(row.losses),
    draws: toNumber(row.draws),
    updatedAt: toIso(row.updated_at),
  };
}

interface FlagRow {
  flag_id: string;
  reason: string;
  severity: PlayerFlag['severity'];
  note: string | null;
  created_by: string;
  created_at: unknown;
  cleared_by: string | null;
  cleared_at: unknown;
}

function rowToFlag(row: FlagRow): PlayerFlag {
  const flag: PlayerFlag = {
    flagId: row.flag_id,
    reason: row.reason,
    severity: row.severity,
    createdAt: toIso(row.created_at),
    createdBy: row.created_by,
  };
  if (row.note != null) flag.note = row.note;
  if (row.cleared_at != null) flag.clearedAt = toIso(row.cleared_at);
  if (row.cleared_by != null) flag.clearedBy = row.cleared_by;
  return flag;
}

interface IdentityRow {
  ip_hash: string | null;
  device_hash: string | null;
  user_agent_hash: string | null;
  observed_at: unknown;
}

function rowToIdentity(row: IdentityRow): IdentityObservation {
  const signal: IdentityObservation = { observedAt: toIso(row.observed_at) };
  if (row.ip_hash != null) signal.ipHash = row.ip_hash;
  if (row.device_hash != null) signal.deviceHash = row.device_hash;
  if (row.user_agent_hash != null) signal.userAgentHash = row.user_agent_hash;
  return signal;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export function createPostgresPvpRepositories(client: SqlClient): PvpRepositories {
  async function loadMatch(q: Queryable, matchId: string): Promise<MatchRecord | null> {
    const matchRes = await q.query<{
      match_id: string;
      seed: number | string;
      p1_id: string;
      p2_id: string;
      winner_id: string | null;
      completion_reason: MatchRecord['completionReason'];
      final_hp_json: Record<string, number> | null;
      created_at: unknown;
    }>(
      `SELECT match_id, seed, p1_id, p2_id, winner_id, completion_reason, final_hp_json, created_at
         FROM pvp_matches WHERE match_id = $1`,
      [matchId],
    );
    const m = matchRes.rows[0];
    if (!m) return null;

    const actionsRes = await q.query<{ player_id: string; action: DuelAction; turn_number: number }>(
      `SELECT player_id, action, turn_number FROM pvp_match_actions
         WHERE match_id = $1 ORDER BY turn_number ASC`,
      [matchId],
    );
    const actions1: DuelAction[] = [];
    const actions2: DuelAction[] = [];
    for (const a of actionsRes.rows) {
      if (a.player_id === m.p1_id) actions1.push(a.action);
      else if (a.player_id === m.p2_id) actions2.push(a.action);
    }

    const ratingRes = await q.query<{ player_id: string; rating_delta: number | string }>(
      `SELECT player_id, rating_delta FROM pvp_rating_events WHERE match_id = $1`,
      [matchId],
    );
    const ratingDelta: Record<string, number> = {};
    for (const r of ratingRes.rows) ratingDelta[r.player_id] = toNumber(r.rating_delta);

    const record: MatchRecord = {
      matchId: m.match_id,
      seed: toNumber(m.seed),
      p1Id: m.p1_id,
      p2Id: m.p2_id,
      actions1,
      actions2,
      winnerId: m.winner_id,
      ratingDelta,
      completionReason: m.completion_reason,
      createdAt: toIso(m.created_at),
    };
    if (m.final_hp_json) record.finalHp = m.final_hp_json;
    return record;
  }

  return {
    players: {
      async upsertRankedPlayer(player: RankedPlayer): Promise<RankedPlayer> {
        const res = await client.query<PlayerRow>(
          `INSERT INTO pvp_players (player_id, display_name, rating, wins, losses, draws, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, now())
           ON CONFLICT (player_id) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             rating = EXCLUDED.rating,
             wins = EXCLUDED.wins,
             losses = EXCLUDED.losses,
             draws = EXCLUDED.draws,
             updated_at = now()
           RETURNING *`,
          [player.id, player.name, player.rating, player.wins, player.losses, player.draws],
        );
        return rowToRankedPlayer(res.rows[0]);
      },

      async getRankedPlayer(playerId: string): Promise<RankedPlayer | null> {
        const res = await client.query<PlayerRow>(`SELECT * FROM pvp_players WHERE player_id = $1`, [playerId]);
        return res.rows[0] ? rowToRankedPlayer(res.rows[0]) : null;
      },

      async listRankedPlayers(limit: number): Promise<RankedPlayer[]> {
        const res = await client.query<PlayerRow>(
          `SELECT * FROM pvp_players ORDER BY rating DESC, player_id ASC LIMIT $1`,
          [limit],
        );
        return res.rows.map(rowToRankedPlayer);
      },
    },

    matches: {
      async insertMatch(record: MatchRecord): Promise<MatchRecord> {
        return transact(client, async (tx) => {
          await tx.query(
            `INSERT INTO pvp_matches
               (match_id, season_id, seed, p1_id, p2_id, status, winner_id, completion_reason, final_hp_json, action_count, created_at, completed_at)
             VALUES ($1, NULL, $2, $3, $4, 'complete', $5, $6, $7, $8, $9, now())`,
            [
              record.matchId,
              record.seed,
              record.p1Id,
              record.p2Id,
              record.winnerId,
              record.completionReason,
              record.finalHp ? JSON.stringify(record.finalHp) : null,
              record.actions1.length + record.actions2.length,
              record.createdAt,
            ],
          );

          // Interleave both players' action logs onto unique turn numbers so the
          // log round-trips while honoring UNIQUE (match_id, turn_number).
          const rounds = Math.max(record.actions1.length, record.actions2.length);
          for (let i = 0; i < rounds; i += 1) {
            if (record.actions1[i] !== undefined) {
              await tx.query(
                `INSERT INTO pvp_match_actions (match_id, turn_number, player_id, action)
                   VALUES ($1, $2, $3, $4)`,
                [record.matchId, i * 2 + 1, record.p1Id, record.actions1[i]],
              );
            }
            if (record.actions2[i] !== undefined) {
              await tx.query(
                `INSERT INTO pvp_match_actions (match_id, turn_number, player_id, action)
                   VALUES ($1, $2, $3, $4)`,
                [record.matchId, i * 2 + 2, record.p2Id, record.actions2[i]],
              );
            }
          }

          // Persist rating events for audit only. Player rating + W/L/D rows are
          // owned by the authoritative in-memory ladder and persisted via
          // upsertRankedPlayer (write-through), so this adapter does NOT mutate
          // pvp_players here. Keeping insertMatch persist-only matches the memory
          // adapter and avoids double-applying Elo when both run under
          // write-through.
          for (const [playerId, delta] of Object.entries(record.ratingDelta)) {
            const existing = await tx.query<{ rating: number | string }>(
              `SELECT rating FROM pvp_players WHERE player_id = $1`,
              [playerId],
            );
            const ratingAfter = existing.rows[0] ? toNumber(existing.rows[0].rating) : 1000;
            const ratingBefore = ratingAfter - delta;
            await tx.query(
              `INSERT INTO pvp_rating_events (match_id, player_id, rating_before, rating_delta, rating_after)
                 VALUES ($1, $2, $3, $4, $5)`,
              [record.matchId, playerId, ratingBefore, delta, ratingAfter],
            );
          }

          const stored = await loadMatch(tx, record.matchId);
          if (!stored) throw new Error('insertMatch: match disappeared after write');
          return stored;
        });
      },

      async getMatch(matchId: string): Promise<MatchRecord | null> {
        return loadMatch(client, matchId);
      },

      async listMatchesForPlayer(playerId: string, seasonId?: string): Promise<MatchRecord[]> {
        const params: unknown[] = [playerId];
        let sql = `SELECT match_id FROM pvp_matches WHERE (p1_id = $1 OR p2_id = $1)`;
        if (seasonId) {
          params.push(seasonId);
          sql += ` AND season_id = $2`;
        }
        sql += ` ORDER BY created_at ASC`;
        const res = await client.query<{ match_id: string }>(sql, params);
        const matches = await Promise.all(res.rows.map((r) => loadMatch(client, r.match_id)));
        return matches.filter((m): m is MatchRecord => m !== null);
      },

      async listSeasonMatches(seasonId: string): Promise<MatchRecord[]> {
        const res = await client.query<{ match_id: string }>(
          `SELECT match_id FROM pvp_matches WHERE season_id = $1 ORDER BY created_at ASC`,
          [seasonId],
        );
        const matches = await Promise.all(res.rows.map((r) => loadMatch(client, r.match_id)));
        return matches.filter((m): m is MatchRecord => m !== null);
      },
    },

    eligibility: {
      async upsertProfile(profile: EligibilityProfile): Promise<EligibilityProfile> {
        await transact(client, async (tx) => {
          await tx.query(
            `INSERT INTO pvp_players (player_id, display_name, wallet_authenticated, admin_excluded, banned, first_seen_at, last_seen_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, now())
             ON CONFLICT (player_id) DO UPDATE SET
               display_name = COALESCE(EXCLUDED.display_name, pvp_players.display_name),
               wallet_authenticated = EXCLUDED.wallet_authenticated,
               admin_excluded = EXCLUDED.admin_excluded,
               banned = EXCLUDED.banned,
               last_seen_at = EXCLUDED.last_seen_at,
               updated_at = now()`,
            [
              profile.playerId,
              profile.displayName ?? profile.playerId,
              profile.walletAuthenticated,
              profile.adminExcluded,
              profile.banned,
              profile.firstSeenAt,
              profile.lastSeenAt,
            ],
          );

          for (const signal of profile.identitySignals) {
            if (!signal.ipHash && !signal.deviceHash && !signal.userAgentHash) continue;
            await tx.query(
              `INSERT INTO pvp_player_identity_signals (player_id, ip_hash, device_hash, user_agent_hash, observed_at)
                 VALUES ($1, $2, $3, $4, $5)`,
              [profile.playerId, signal.ipHash ?? null, signal.deviceHash ?? null, signal.userAgentHash ?? null, signal.observedAt],
            );
          }
        });
        const stored = await this.getProfile(profile.playerId);
        return stored ?? profile;
      },

      async getProfile(playerId: string): Promise<EligibilityProfile | null> {
        const playerRes = await client.query<PlayerRow>(`SELECT * FROM pvp_players WHERE player_id = $1`, [playerId]);
        const p = playerRes.rows[0];
        if (!p) return null;

        const flagsRes = await client.query<FlagRow>(
          `SELECT * FROM pvp_player_flags WHERE player_id = $1 ORDER BY created_at ASC`,
          [playerId],
        );
        const idRes = await client.query<IdentityRow>(
          `SELECT ip_hash, device_hash, user_agent_hash, observed_at FROM pvp_player_identity_signals
             WHERE player_id = $1 ORDER BY observed_at ASC`,
          [playerId],
        );

        const profile: EligibilityProfile = {
          playerId: p.player_id,
          walletAuthenticated: toBool(p.wallet_authenticated),
          firstSeenAt: toIso(p.first_seen_at),
          lastSeenAt: toIso(p.last_seen_at),
          adminExcluded: toBool(p.admin_excluded),
          banned: toBool(p.banned),
          flags: flagsRes.rows.map(rowToFlag),
          identitySignals: idRes.rows.map(rowToIdentity),
        };
        if (p.display_name) profile.displayName = p.display_name;
        return profile;
      },

      async insertFlag(playerId: string, flag: PlayerFlag): Promise<PlayerFlag> {
        const flagId = flag.flagId || crypto.randomUUID();
        const res = await client.query<FlagRow>(
          `INSERT INTO pvp_player_flags (flag_id, player_id, reason, severity, note, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()))
           RETURNING *`,
          [flagId, playerId, flag.reason, flag.severity, flag.note ?? null, flag.createdBy, flag.createdAt ?? null],
        );
        return rowToFlag(res.rows[0]);
      },

      async clearFlag(playerId: string, flagId: string | null, clearedBy: string): Promise<void> {
        if (flagId) {
          await client.query(
            `UPDATE pvp_player_flags SET cleared_by = $3, cleared_at = now()
               WHERE player_id = $1 AND flag_id = $2 AND cleared_at IS NULL`,
            [playerId, flagId, clearedBy],
          );
        } else {
          await client.query(
            `UPDATE pvp_player_flags SET cleared_by = $2, cleared_at = now()
               WHERE player_id = $1 AND cleared_at IS NULL`,
            [playerId, clearedBy],
          );
        }
      },

      async saveEvaluation(seasonId: string, evaluation: EligibilityEvaluation): Promise<void> {
        await client.query(
          `INSERT INTO pvp_eligibility_evaluations (season_id, player_id, status, eligible, evaluation_json, evaluated_at)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
           ON CONFLICT (season_id, player_id) DO UPDATE SET
             status = EXCLUDED.status,
             eligible = EXCLUDED.eligible,
             evaluation_json = EXCLUDED.evaluation_json,
             evaluated_at = EXCLUDED.evaluated_at`,
          [
            seasonId,
            evaluation.playerId,
            evaluation.status,
            evaluation.eligible,
            JSON.stringify(evaluation),
            evaluation.evaluatedAt ?? null,
          ],
        );
      },
    },

    seasons: {
      async saveSnapshot(snapshot: SeasonSnapshot): Promise<SeasonSnapshot> {
        const snapshotId = crypto.randomUUID();
        await client.query(
          `INSERT INTO pvp_season_snapshots (snapshot_id, season_id, generated_by_admin, generated_at, rules_summary_json, snapshot_json)
             VALUES ($1, $2, $3, COALESCE($4, now()), $5, $6)`,
          [
            snapshotId,
            snapshot.seasonId,
            'system',
            snapshot.generatedAt ?? null,
            JSON.stringify(snapshot.rulesSummary),
            JSON.stringify(snapshot),
          ],
        );
        return snapshot;
      },

      async getLatestSnapshot(seasonId: string): Promise<SeasonSnapshot | null> {
        const res = await client.query<{ snapshot_json: SeasonSnapshot | string }>(
          `SELECT snapshot_json FROM pvp_season_snapshots
             WHERE season_id = $1 ORDER BY generated_at DESC, snapshot_id DESC LIMIT 1`,
          [seasonId],
        );
        const row = res.rows[0];
        if (!row) return null;
        return typeof row.snapshot_json === 'string'
          ? (JSON.parse(row.snapshot_json) as SeasonSnapshot)
          : row.snapshot_json;
      },

      async savePayoutPlan(seasonId: string, payoutPlanJson: unknown, createdBy: string): Promise<void> {
        const prizePoolRaw =
          typeof payoutPlanJson === 'object' && payoutPlanJson !== null && 'prizePoolRaw' in payoutPlanJson
            ? String((payoutPlanJson as { prizePoolRaw: unknown }).prizePoolRaw)
            : '0';
        await client.query(
          `INSERT INTO pvp_payout_plans (plan_id, season_id, created_by_admin, prize_pool_raw, plan_json, status)
             VALUES ($1, $2, $3, $4, $5, 'pending_review')`,
          [crypto.randomUUID(), seasonId, createdBy, prizePoolRaw, JSON.stringify(payoutPlanJson)],
        );
      },
    },
  };
}
