import { describe, it, expect, beforeEach } from 'vitest';
import { createPostgresPvpRepositories, type SqlClient, type SqlQueryResult } from './postgresRepositories.js';
import type { MatchRecord, RankedPlayer } from '../ladder.js';
import type { EligibilityEvaluation, EligibilityProfile, SeasonSnapshot } from '../eligibility.js';

/**
 * In-memory emulation of the subset of Postgres behavior the adapter relies on.
 *
 * It is deliberately statement-aware (it recognizes each query the adapter
 * issues) so the tests exercise real SQL/param wiring and snake_case<->camelCase
 * mapping without needing a live database in CI. JSONB columns are parsed on
 * write to mirror node-postgres returning JS objects for jsonb.
 */
class FakeSqlClient implements SqlClient {
  players = new Map<string, Record<string, unknown>>();
  matches: Record<string, unknown>[] = [];
  actions: Record<string, unknown>[] = [];
  ratingEvents: Record<string, unknown>[] = [];
  flags: Record<string, unknown>[] = [];
  identity: Record<string, unknown>[] = [];
  evaluations = new Map<string, Record<string, unknown>>();
  snapshots: Record<string, unknown>[] = [];
  payoutPlans: Record<string, unknown>[] = [];
  private tick = 1_700_000_000_000;

  private now(): string {
    this.tick += 1;
    return new Date(this.tick).toISOString();
  }

  async query<T = unknown>(rawSql: string, params: readonly unknown[] = []): Promise<SqlQueryResult<T>> {
    const sql = rawSql.replace(/\s+/g, ' ').trim();
    const rows = this.dispatch(sql, params);
    return { rows: rows as T[] };
  }

  private dispatch(sql: string, p: readonly unknown[]): Record<string, unknown>[] {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return [];

    // --- pvp_players ---
    if (sql.startsWith('INSERT INTO pvp_players') && sql.includes('rating, wins, losses, draws')) {
      const [id, name, rating, wins, losses, draws] = p as [string, string, number, number, number, number];
      const existing = this.players.get(id);
      const row = existing ?? this.newPlayer(id);
      Object.assign(row, {
        display_name: name,
        rating,
        wins,
        losses,
        draws,
        updated_at: this.now(),
      });
      this.players.set(id, row);
      return [{ ...row }];
    }
    if (sql.startsWith('INSERT INTO pvp_players') && sql.includes('wallet_authenticated, admin_excluded, banned')) {
      const [id, name, walletAuth, adminExcluded, banned, firstSeen, lastSeen] = p as [
        string, string, boolean, boolean, boolean, string, string,
      ];
      const existing = this.players.get(id);
      const row = existing ?? this.newPlayer(id, firstSeen);
      row.display_name = name ?? row.display_name;
      row.wallet_authenticated = walletAuth;
      row.admin_excluded = adminExcluded;
      row.banned = banned;
      row.last_seen_at = lastSeen;
      row.updated_at = this.now();
      if (!existing) row.first_seen_at = firstSeen;
      this.players.set(id, row);
      return [];
    }
    if (sql.startsWith('SELECT * FROM pvp_players WHERE player_id = $1')) {
      const row = this.players.get(p[0] as string);
      return row ? [{ ...row }] : [];
    }
    if (sql.startsWith('SELECT * FROM pvp_players ORDER BY rating DESC')) {
      const limit = p[0] as number;
      return [...this.players.values()]
        .sort((a, b) => (b.rating as number) - (a.rating as number) || String(a.player_id).localeCompare(String(b.player_id)))
        .slice(0, limit)
        .map((r) => ({ ...r }));
    }
    if (sql.startsWith('SELECT rating FROM pvp_players WHERE player_id = $1')) {
      const row = this.players.get(p[0] as string);
      return row ? [{ rating: row.rating }] : [];
    }
    if (sql.startsWith('UPDATE pvp_players SET rating')) {
      const row = this.players.get(p[0] as string);
      if (row) {
        row.rating = p[1];
        if (sql.includes('wins = wins + 1')) row.wins = (row.wins as number) + 1;
        else if (sql.includes('losses = losses + 1')) row.losses = (row.losses as number) + 1;
        else if (sql.includes('draws = draws + 1')) row.draws = (row.draws as number) + 1;
        row.updated_at = this.now();
      }
      return [];
    }

    // --- pvp_matches ---
    if (sql.startsWith('INSERT INTO pvp_matches')) {
      const [matchId, seed, p1Id, p2Id, winnerId, completionReason, finalHpJson, actionCount, createdAt] = p as [
        string, number, string, string, string | null, string, string | null, number, string,
      ];
      this.matches.push({
        match_id: matchId,
        season_id: null,
        seed,
        p1_id: p1Id,
        p2_id: p2Id,
        status: 'complete',
        winner_id: winnerId,
        completion_reason: completionReason,
        final_hp_json: finalHpJson ? JSON.parse(finalHpJson) : null,
        action_count: actionCount,
        created_at: createdAt,
      });
      return [];
    }
    if (sql.startsWith('SELECT match_id, seed, p1_id, p2_id, winner_id, completion_reason, final_hp_json, created_at FROM pvp_matches')) {
      const m = this.matches.find((r) => r.match_id === p[0]);
      return m ? [{ ...m }] : [];
    }
    if (sql.startsWith('SELECT match_id FROM pvp_matches WHERE (p1_id = $1 OR p2_id = $1)')) {
      const id = p[0];
      const seasonId = sql.includes('season_id = $2') ? p[1] : undefined;
      return this.matches
        .filter((m) => (m.p1_id === id || m.p2_id === id) && (seasonId === undefined || m.season_id === seasonId))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((m) => ({ match_id: m.match_id }));
    }
    if (sql.startsWith('SELECT match_id FROM pvp_matches WHERE season_id = $1')) {
      return this.matches.filter((m) => m.season_id === p[0]).map((m) => ({ match_id: m.match_id }));
    }

    // --- pvp_match_actions ---
    if (sql.startsWith('INSERT INTO pvp_match_actions')) {
      const [matchId, turnNumber, playerId, action] = p as [string, number, string, string];
      this.actions.push({ match_id: matchId, turn_number: turnNumber, player_id: playerId, action });
      return [];
    }
    if (sql.startsWith('SELECT player_id, action, turn_number FROM pvp_match_actions')) {
      return this.actions
        .filter((a) => a.match_id === p[0])
        .sort((a, b) => (a.turn_number as number) - (b.turn_number as number))
        .map((a) => ({ ...a }));
    }

    // --- pvp_rating_events ---
    if (sql.startsWith('INSERT INTO pvp_rating_events')) {
      const [matchId, playerId, before, delta, after] = p as [string, string, number, number, number];
      this.ratingEvents.push({
        match_id: matchId,
        player_id: playerId,
        rating_before: before,
        rating_delta: delta,
        rating_after: after,
      });
      return [];
    }
    if (sql.startsWith('SELECT player_id, rating_delta FROM pvp_rating_events')) {
      return this.ratingEvents.filter((r) => r.match_id === p[0]).map((r) => ({ ...r }));
    }

    // --- pvp_player_flags ---
    if (sql.startsWith('INSERT INTO pvp_player_flags')) {
      const [flagId, playerId, reason, severity, note, createdBy, createdAt] = p as [
        string, string, string, string, string | null, string, string | null,
      ];
      const row = {
        flag_id: flagId,
        player_id: playerId,
        reason,
        severity,
        note,
        created_by: createdBy,
        created_at: createdAt ?? this.now(),
        cleared_by: null,
        cleared_at: null,
      };
      this.flags.push(row);
      return [{ ...row }];
    }
    if (sql.startsWith('SELECT * FROM pvp_player_flags WHERE player_id = $1')) {
      return this.flags
        .filter((f) => f.player_id === p[0])
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((f) => ({ ...f }));
    }
    if (sql.startsWith('UPDATE pvp_player_flags SET cleared_by')) {
      const withFlagId = sql.includes('flag_id = $2');
      for (const f of this.flags) {
        if (f.player_id !== p[0] || f.cleared_at !== null) continue;
        if (withFlagId && f.flag_id !== p[1]) continue;
        f.cleared_by = withFlagId ? p[2] : p[1];
        f.cleared_at = this.now();
      }
      return [];
    }

    // --- pvp_player_identity_signals ---
    if (sql.startsWith('INSERT INTO pvp_player_identity_signals')) {
      const [playerId, ipHash, deviceHash, uaHash, observedAt] = p as [
        string, string | null, string | null, string | null, string,
      ];
      this.identity.push({
        player_id: playerId,
        ip_hash: ipHash,
        device_hash: deviceHash,
        user_agent_hash: uaHash,
        observed_at: observedAt,
      });
      return [];
    }
    if (sql.startsWith('SELECT ip_hash, device_hash, user_agent_hash, observed_at FROM pvp_player_identity_signals')) {
      return this.identity
        .filter((s) => s.player_id === p[0])
        .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)))
        .map((s) => ({ ...s }));
    }

    // --- pvp_eligibility_evaluations ---
    if (sql.startsWith('INSERT INTO pvp_eligibility_evaluations')) {
      const [seasonId, playerId, status, eligible, evaluationJson, evaluatedAt] = p as [
        string, string, string, boolean, string, string | null,
      ];
      this.evaluations.set(`${seasonId}:${playerId}`, {
        season_id: seasonId,
        player_id: playerId,
        status,
        eligible,
        evaluation_json: JSON.parse(evaluationJson),
        evaluated_at: evaluatedAt ?? this.now(),
      });
      return [];
    }

    // --- pvp_season_snapshots ---
    if (sql.startsWith('INSERT INTO pvp_season_snapshots')) {
      const [snapshotId, seasonId, generatedByAdmin, generatedAt, rulesSummaryJson, snapshotJson] = p as [
        string, string, string, string | null, string, string,
      ];
      this.snapshots.push({
        snapshot_id: snapshotId,
        season_id: seasonId,
        generated_by_admin: generatedByAdmin,
        generated_at: generatedAt ?? this.now(),
        rules_summary_json: JSON.parse(rulesSummaryJson),
        snapshot_json: JSON.parse(snapshotJson),
      });
      return [];
    }
    if (sql.startsWith('SELECT snapshot_json FROM pvp_season_snapshots')) {
      const latest = this.snapshots
        .filter((s) => s.season_id === p[0])
        .sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)))[0];
      return latest ? [{ snapshot_json: latest.snapshot_json }] : [];
    }

    // --- pvp_payout_plans ---
    if (sql.startsWith('INSERT INTO pvp_payout_plans')) {
      const [planId, seasonId, createdBy, prizePoolRaw, planJson] = p as [string, string, string, string, string];
      this.payoutPlans.push({
        plan_id: planId,
        season_id: seasonId,
        created_by_admin: createdBy,
        prize_pool_raw: prizePoolRaw,
        plan_json: JSON.parse(planJson),
        status: 'pending_review',
      });
      return [];
    }

    throw new Error(`FakeSqlClient: unhandled SQL: ${sql}`);
  }

  private newPlayer(id: string, firstSeen?: string): Record<string, unknown> {
    const ts = firstSeen ?? this.now();
    return {
      player_id: id,
      display_name: id,
      rating: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      wallet_authenticated: true,
      eligibility_status: 'ineligible',
      admin_excluded: false,
      banned: false,
      first_seen_at: ts,
      last_seen_at: ts,
      updated_at: ts,
    };
  }
}

function rankedPlayer(id: string, overrides: Partial<RankedPlayer> = {}): RankedPlayer {
  return { id, name: id, rating: 1000, wins: 0, losses: 0, draws: 0, updatedAt: '2026-01-01T00:00:00.000Z', ...overrides };
}

describe('postgres pvp repositories', () => {
  let db: FakeSqlClient;
  let repos: ReturnType<typeof createPostgresPvpRepositories>;

  beforeEach(() => {
    db = new FakeSqlClient();
    repos = createPostgresPvpRepositories(db);
  });

  it('inserts and retrieves a ranked player', async () => {
    const saved = await repos.players.upsertRankedPlayer(rankedPlayer('alice', { rating: 1180, wins: 5, losses: 2 }));
    expect(saved).toMatchObject({ id: 'alice', name: 'alice', rating: 1180, wins: 5, losses: 2 });

    const fetched = await repos.players.getRankedPlayer('alice');
    expect(fetched).toMatchObject({ id: 'alice', rating: 1180, wins: 5 });
    expect(await repos.players.getRankedPlayer('nobody')).toBeNull();
  });

  it('upsert overwrites an existing ranked player and lists by rating', async () => {
    await repos.players.upsertRankedPlayer(rankedPlayer('alice', { rating: 1000 }));
    await repos.players.upsertRankedPlayer(rankedPlayer('bob', { rating: 1300 }));
    await repos.players.upsertRankedPlayer(rankedPlayer('alice', { rating: 1500, wins: 9 }));

    const board = await repos.players.listRankedPlayers(10);
    expect(board.map((p) => p.id)).toEqual(['alice', 'bob']);
    expect(board[0]).toMatchObject({ id: 'alice', rating: 1500, wins: 9 });
  });

  it('inserts and retrieves a match with action logs and applies rating updates', async () => {
    await repos.players.upsertRankedPlayer(rankedPlayer('alice', { rating: 1000 }));
    await repos.players.upsertRankedPlayer(rankedPlayer('bob', { rating: 1000 }));

    const record: MatchRecord = {
      matchId: 'm1',
      seed: 42,
      p1Id: 'alice',
      p2Id: 'bob',
      actions1: ['attack', 'freeze', 'attack'],
      actions2: ['defend', 'attack'],
      winnerId: 'alice',
      ratingDelta: { alice: 16, bob: -16 },
      completionReason: 'combat',
      finalHp: { alice: 12, bob: 0 },
      createdAt: '2026-02-01T00:00:00.000Z',
    };

    const stored = await repos.matches.insertMatch(record);
    expect(stored.actions1).toEqual(['attack', 'freeze', 'attack']);
    expect(stored.actions2).toEqual(['defend', 'attack']);
    expect(stored.winnerId).toBe('alice');
    expect(stored.ratingDelta).toEqual({ alice: 16, bob: -16 });
    expect(stored.finalHp).toEqual({ alice: 12, bob: 0 });

    const fetched = await repos.matches.getMatch('m1');
    expect(fetched).not.toBeNull();
    expect(fetched?.actions1).toEqual(['attack', 'freeze', 'attack']);
    expect(fetched?.seed).toBe(42);

    // Persist-only: insertMatch records the match + rating events but does NOT
    // mutate player rows (the ladder owns live ratings, persisted via upsert).
    const alice = await repos.players.getRankedPlayer('alice');
    const bob = await repos.players.getRankedPlayer('bob');
    expect(alice).toMatchObject({ rating: 1000, wins: 0, losses: 0 });
    expect(bob).toMatchObject({ rating: 1000, wins: 0, losses: 0 });

    expect(await repos.matches.getMatch('missing')).toBeNull();
  });

  it('persists a match without mutating player rows (persist-only)', async () => {
    await repos.players.upsertRankedPlayer(rankedPlayer('a', { rating: 1000 }));
    await repos.players.upsertRankedPlayer(rankedPlayer('b', { rating: 1000 }));
    await repos.matches.insertMatch({
      matchId: 'draw1',
      seed: 1,
      p1Id: 'a',
      p2Id: 'b',
      actions1: ['attack'],
      actions2: ['attack'],
      winnerId: null,
      ratingDelta: { a: 0, b: 0 },
      completionReason: 'combat',
      createdAt: '2026-02-02T00:00:00.000Z',
    });
    const stored = await repos.matches.getMatch('draw1');
    expect(stored?.winnerId).toBeNull();
    expect(await repos.players.getRankedPlayer('a')).toMatchObject({ wins: 0, losses: 0, draws: 0 });
    expect(await repos.players.getRankedPlayer('b')).toMatchObject({ wins: 0, losses: 0, draws: 0 });
  });

  it('lists matches for a player ordered by creation', async () => {
    await repos.players.upsertRankedPlayer(rankedPlayer('alice'));
    await repos.players.upsertRankedPlayer(rankedPlayer('bob'));
    await repos.players.upsertRankedPlayer(rankedPlayer('carol'));
    await repos.matches.insertMatch(matchBetween('m1', 'alice', 'bob', '2026-03-01T00:00:00.000Z'));
    await repos.matches.insertMatch(matchBetween('m2', 'carol', 'alice', '2026-03-02T00:00:00.000Z'));
    await repos.matches.insertMatch(matchBetween('m3', 'bob', 'carol', '2026-03-03T00:00:00.000Z'));

    const aliceMatches = await repos.matches.listMatchesForPlayer('alice');
    expect(aliceMatches.map((m) => m.matchId)).toEqual(['m1', 'm2']);
  });

  it('saves and retrieves the latest season snapshot', async () => {
    const base: SeasonSnapshot = {
      seasonId: 'season-1',
      generatedAt: '2026-04-01T00:00:00.000Z',
      rulesSummary: { seasonId: 'season-1' } as SeasonSnapshot['rulesSummary'],
      rows: [],
      eligiblePlayers: [rankedPlayer('alice', { rating: 1200 })],
      flaggedCount: 0,
      ineligibleCount: 1,
      bannedOrExcludedCount: 0,
    };
    await repos.seasons.saveSnapshot(base);
    await repos.seasons.saveSnapshot({ ...base, generatedAt: '2026-04-05T00:00:00.000Z', ineligibleCount: 3 });

    const latest = await repos.seasons.getLatestSnapshot('season-1');
    expect(latest?.generatedAt).toBe('2026-04-05T00:00:00.000Z');
    expect(latest?.ineligibleCount).toBe(3);
    expect(latest?.eligiblePlayers[0]).toMatchObject({ id: 'alice', rating: 1200 });
    expect(await repos.seasons.getLatestSnapshot('no-season')).toBeNull();
  });

  it('saves a payout plan with extracted prize pool', async () => {
    await repos.seasons.savePayoutPlan('season-1', { prizePoolRaw: '5000000', payouts: [] }, 'admin-1');
    expect(db.payoutPlans).toHaveLength(1);
    expect(db.payoutPlans[0]).toMatchObject({
      season_id: 'season-1',
      created_by_admin: 'admin-1',
      prize_pool_raw: '5000000',
      status: 'pending_review',
    });
  });

  it('persists and reconstructs an eligibility profile with flags and identity signals', async () => {
    const profile: EligibilityProfile = {
      playerId: 'alice',
      displayName: 'Alice',
      walletAuthenticated: true,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      adminExcluded: false,
      banned: false,
      flags: [],
      identitySignals: [{ observedAt: '2026-01-01T00:00:00.000Z', ipHash: 'iphash', deviceHash: 'devhash' }],
    };
    const saved = await repos.eligibility.upsertProfile(profile);
    expect(saved).toMatchObject({ playerId: 'alice', displayName: 'Alice', walletAuthenticated: true });
    expect(saved.identitySignals).toHaveLength(1);
    expect(saved.identitySignals[0]).toMatchObject({ ipHash: 'iphash', deviceHash: 'devhash' });

    const flag = await repos.eligibility.insertFlag('alice', {
      flagId: 'flag-1',
      reason: 'sybil-cluster',
      severity: 'high',
      createdBy: 'admin-1',
      createdAt: '2026-01-03T00:00:00.000Z',
    });
    expect(flag).toMatchObject({ flagId: 'flag-1', reason: 'sybil-cluster', severity: 'high' });

    const withFlag = await repos.eligibility.getProfile('alice');
    expect(withFlag?.flags).toHaveLength(1);
    expect(withFlag?.flags[0]).toMatchObject({ flagId: 'flag-1' });
    expect(withFlag?.flags[0].clearedAt).toBeUndefined();

    await repos.eligibility.clearFlag('alice', 'flag-1', 'admin-2');
    const cleared = await repos.eligibility.getProfile('alice');
    expect(cleared?.flags[0].clearedBy).toBe('admin-2');
    expect(cleared?.flags[0].clearedAt).toBeDefined();
  });

  it('saves an eligibility evaluation (upsert by season+player)', async () => {
    await repos.players.upsertRankedPlayer(rankedPlayer('alice'));
    const evaluation = {
      playerId: 'alice',
      status: 'eligible',
      eligible: true,
      reasons: [],
      warnings: [],
      evaluatedAt: '2026-05-01T00:00:00.000Z',
    } as unknown as EligibilityEvaluation;
    await repos.eligibility.saveEvaluation('season-1', evaluation);
    await repos.eligibility.saveEvaluation('season-1', { ...evaluation, status: 'ineligible', eligible: false });

    const stored = db.evaluations.get('season-1:alice');
    expect(stored).toMatchObject({ status: 'ineligible', eligible: false });
    expect(db.evaluations.size).toBe(1);
  });
});

function matchBetween(matchId: string, p1: string, p2: string, createdAt: string): MatchRecord {
  return {
    matchId,
    seed: 1,
    p1Id: p1,
    p2Id: p2,
    actions1: ['attack'],
    actions2: ['attack'],
    winnerId: p1,
    ratingDelta: { [p1]: 8, [p2]: -8 },
    completionReason: 'combat',
    createdAt,
  };
}
