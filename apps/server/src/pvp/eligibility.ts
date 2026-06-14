import crypto from 'node:crypto';
import { ladder, type MatchCompletionReason, type MatchRecord, type RankedPlayer } from './ladder.js';
import { buildPayoutPlanFromPlayers, type PayoutPlan, type SeasonConfig } from './season.js';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'flagged_review' | 'banned' | 'admin_excluded';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IdentityObservation = {
  observedAt: string;
  ipHash?: string;
  deviceHash?: string;
  userAgentHash?: string;
};

export type PlayerFlag = {
  flagId: string;
  reason: string;
  severity: FlagSeverity;
  note?: string;
  createdAt: string;
  createdBy: string;
  clearedAt?: string;
  clearedBy?: string;
};

export type EligibilityProfile = {
  playerId: string;
  displayName?: string;
  walletAuthenticated: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  adminExcluded: boolean;
  banned: boolean;
  flags: PlayerFlag[];
  identitySignals: IdentityObservation[];
};

export type EligibilityRules = {
  seasonId: string;
  seasonCutoffAt: string;
  minAccountAgeDays: number;
  minCompletedMatches: number;
  minUniqueOpponents: number;
  maxCountedMatchesPerOpponent: number;
  maxForfeitRate: number;
  shortMatchMaxActions: number;
  maxShortMatchRate: number;
  maxIdentityClusterSize: number;
  fingerprintingEnabled: boolean;
  fingerprintSalt: string;
  testWalletPrefixes: string[];
  adminExcludedWallets: string[];
};

export type EligibilityStats = {
  completedMatches: number;
  countedMatches: number;
  uniqueOpponents: number;
  maxMatchesAgainstSingleOpponent: number;
  wins: number;
  losses: number;
  draws: number;
  forfeitsOrTimeouts: number;
  forfeitRate: number;
  shortMatches: number;
  shortMatchRate: number;
  strongestIdentityClusterSize: number;
};

export type EligibilityEvaluation = {
  playerId: string;
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  stats: EligibilityStats;
  profile: Omit<EligibilityProfile, 'flags' | 'identitySignals'> & { activeFlagCount: number; identitySignalCount: number };
  evaluatedAt: string;
};

export type SeasonSnapshotRow = {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  stats: EligibilityStats;
};

export type SeasonSnapshot = {
  seasonId: string;
  generatedAt: string;
  rulesSummary: Omit<EligibilityRules, 'fingerprintSalt'>;
  rows: SeasonSnapshotRow[];
  eligiblePlayers: RankedPlayer[];
  flaggedCount: number;
  ineligibleCount: number;
  bannedOrExcludedCount: number;
};

export type RegisterPlayerInput = {
  playerId: string;
  displayName?: string;
  walletAuthenticated?: boolean;
  observedAt?: string;
  identity?: IdentityObservation;
};

export type RawIdentityInput = {
  ip?: string;
  deviceFingerprint?: string;
  userAgent?: string;
};

const profiles = new Map<string, EligibilityProfile>();
const snapshots = new Map<string, SeasonSnapshot>();

function nowIso(): string {
  return new Date().toISOString();
}

function activeFlags(profile: EligibilityProfile): PlayerFlag[] {
  return profile.flags.filter((flag) => !flag.clearedAt);
}

function cloneProfile(profile: EligibilityProfile): EligibilityProfile {
  return {
    ...profile,
    flags: profile.flags.map((flag) => ({ ...flag })),
    identitySignals: profile.identitySignals.map((signal) => ({ ...signal })),
  };
}

function getOrCreateProfile(playerId: string, displayName?: string, observedAt = nowIso()): EligibilityProfile {
  let profile = profiles.get(playerId);
  if (!profile) {
    profile = {
      playerId,
      displayName,
      walletAuthenticated: false,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      adminExcluded: false,
      banned: false,
      flags: [],
      identitySignals: [],
    };
    profiles.set(playerId, profile);
  }
  if (displayName) profile.displayName = displayName;
  profile.lastSeenAt = observedAt;
  return profile;
}

function hashSignal(value: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function buildPrivacySafeIdentityObservation(
  input: RawIdentityInput,
  rules: Pick<EligibilityRules, 'fingerprintingEnabled' | 'fingerprintSalt'>,
  observedAt = nowIso(),
): IdentityObservation | undefined {
  if (!rules.fingerprintingEnabled) return undefined;
  const salt = rules.fingerprintSalt.trim();
  if (!salt) return undefined;

  const out: IdentityObservation = { observedAt };
  if (input.ip) out.ipHash = hashSignal(input.ip, salt);
  if (input.deviceFingerprint) out.deviceHash = hashSignal(input.deviceFingerprint, salt);
  if (input.userAgent) out.userAgentHash = hashSignal(input.userAgent, salt);

  return out.ipHash || out.deviceHash || out.userAgentHash ? out : undefined;
}

function playerMatches(playerId: string, matches: MatchRecord[]): MatchRecord[] {
  return matches.filter((m) => m.p1Id === playerId || m.p2Id === playerId);
}

function opponentFor(playerId: string, match: MatchRecord): string {
  return match.p1Id === playerId ? match.p2Id : match.p1Id;
}

function countByOpponent(playerId: string, matches: MatchRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of matches) {
    const opp = opponentFor(playerId, match);
    counts.set(opp, (counts.get(opp) ?? 0) + 1);
  }
  return counts;
}

function identityClusterSize(profile: EligibilityProfile): number {
  const hashes = new Set<string>();
  for (const signal of profile.identitySignals) {
    if (signal.ipHash) hashes.add(`ip:${signal.ipHash}`);
    if (signal.deviceHash) hashes.add(`device:${signal.deviceHash}`);
    if (signal.userAgentHash) hashes.add(`ua:${signal.userAgentHash}`);
  }
  if (hashes.size === 0) return 1;

  let max = 1;
  for (const hash of hashes) {
    let count = 0;
    for (const other of profiles.values()) {
      const otherHashes = new Set<string>();
      for (const signal of other.identitySignals) {
        if (signal.ipHash) otherHashes.add(`ip:${signal.ipHash}`);
        if (signal.deviceHash) otherHashes.add(`device:${signal.deviceHash}`);
        if (signal.userAgentHash) otherHashes.add(`ua:${signal.userAgentHash}`);
      }
      if (otherHashes.has(hash)) count += 1;
    }
    max = Math.max(max, count);
  }
  return max;
}

function statsFor(playerId: string, matches = ladder.listMatches()): EligibilityStats {
  const played = playerMatches(playerId, matches);
  const counts = countByOpponent(playerId, played);
  const completedMatches = played.length;
  const uniqueOpponents = counts.size;
  const countedMatches = [...counts.values()].reduce((sum, count) => sum + Math.min(count, 3), 0);
  const wins = played.filter((m) => m.winnerId === playerId).length;
  const losses = played.filter((m) => m.winnerId && m.winnerId !== playerId).length;
  const draws = played.filter((m) => m.winnerId === null).length;
  const forfeitsOrTimeouts = played.filter((m) => m.completionReason === 'forfeit' || m.completionReason === 'timeout').length;
  const shortMatches = played.filter((m) => m.actions1.length + m.actions2.length <= 3).length;
  const profile = profiles.get(playerId);

  return {
    completedMatches,
    countedMatches,
    uniqueOpponents,
    maxMatchesAgainstSingleOpponent: counts.size ? Math.max(...counts.values()) : 0,
    wins,
    losses,
    draws,
    forfeitsOrTimeouts,
    forfeitRate: completedMatches ? forfeitsOrTimeouts / completedMatches : 0,
    shortMatches,
    shortMatchRate: completedMatches ? shortMatches / completedMatches : 0,
    strongestIdentityClusterSize: profile ? identityClusterSize(profile) : 1,
  };
}

function statsForWithRules(playerId: string, rules: EligibilityRules, matches = ladder.listMatches()): EligibilityStats {
  const played = playerMatches(playerId, matches);
  const counts = countByOpponent(playerId, played);
  const completedMatches = played.length;
  const uniqueOpponents = counts.size;
  const countedMatches = [...counts.values()].reduce((sum, count) => sum + Math.min(count, rules.maxCountedMatchesPerOpponent), 0);
  const wins = played.filter((m) => m.winnerId === playerId).length;
  const losses = played.filter((m) => m.winnerId && m.winnerId !== playerId).length;
  const draws = played.filter((m) => m.winnerId === null).length;
  const forfeitsOrTimeouts = played.filter((m) => m.completionReason === 'forfeit' || m.completionReason === 'timeout').length;
  const shortMatches = played.filter((m) => m.actions1.length + m.actions2.length <= rules.shortMatchMaxActions).length;
  const profile = profiles.get(playerId);

  return {
    completedMatches,
    countedMatches,
    uniqueOpponents,
    maxMatchesAgainstSingleOpponent: counts.size ? Math.max(...counts.values()) : 0,
    wins,
    losses,
    draws,
    forfeitsOrTimeouts,
    forfeitRate: completedMatches ? forfeitsOrTimeouts / completedMatches : 0,
    shortMatches,
    shortMatchRate: completedMatches ? shortMatches / completedMatches : 0,
    strongestIdentityClusterSize: profile ? identityClusterSize(profile) : 1,
  };
}

function safePlayerSummary(profile: EligibilityProfile): EligibilityEvaluation['profile'] {
  return {
    playerId: profile.playerId,
    displayName: profile.displayName,
    walletAuthenticated: profile.walletAuthenticated,
    firstSeenAt: profile.firstSeenAt,
    lastSeenAt: profile.lastSeenAt,
    adminExcluded: profile.adminExcluded,
    banned: profile.banned,
    activeFlagCount: activeFlags(profile).length,
    identitySignalCount: profile.identitySignals.length,
  };
}

function isTestWallet(playerId: string, rules: EligibilityRules): boolean {
  return rules.testWalletPrefixes.some((prefix) => prefix && playerId.startsWith(prefix));
}

export const eligibility = {
  registerPlayer(input: RegisterPlayerInput): EligibilityProfile {
    const observedAt = input.observedAt ?? nowIso();
    const profile = getOrCreateProfile(input.playerId, input.displayName, observedAt);
    if (input.walletAuthenticated) profile.walletAuthenticated = true;
    if (input.identity) profile.identitySignals.push({ ...input.identity, observedAt: input.identity.observedAt ?? observedAt });
    return cloneProfile(profile);
  },

  getProfile(playerId: string): EligibilityProfile | undefined {
    const profile = profiles.get(playerId);
    return profile ? cloneProfile(profile) : undefined;
  },

  listProfiles(): EligibilityProfile[] {
    return [...profiles.values()].map(cloneProfile);
  },

  flagPlayer(playerId: string, reason: string, severity: FlagSeverity = 'medium', createdBy = 'admin', note?: string): PlayerFlag {
    const profile = getOrCreateProfile(playerId);
    const flag: PlayerFlag = {
      flagId: crypto.randomUUID(),
      reason,
      severity,
      note,
      createdAt: nowIso(),
      createdBy,
    };
    profile.flags.push(flag);
    return { ...flag };
  },

  banPlayer(playerId: string, createdBy = 'admin', reason = 'admin ban'): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    profile.banned = true;
    this.flagPlayer(playerId, reason, 'critical', createdBy);
    return cloneProfile(profile);
  },

  clearFlag(playerId: string, flagId?: string, clearedBy = 'admin'): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    const clearedAt = nowIso();
    for (const flag of profile.flags) {
      if (!flag.clearedAt && (!flagId || flag.flagId === flagId)) {
        flag.clearedAt = clearedAt;
        flag.clearedBy = clearedBy;
      }
    }
    return cloneProfile(profile);
  },

  setAdminExcluded(playerId: string, excluded: boolean, createdBy = 'admin', note?: string): EligibilityProfile {
    const profile = getOrCreateProfile(playerId);
    profile.adminExcluded = excluded;
    if (excluded) this.flagPlayer(playerId, 'admin excluded from prize eligibility', 'high', createdBy, note);
    return cloneProfile(profile);
  },

  evaluatePlayer(playerId: string, rules: EligibilityRules): EligibilityEvaluation {
    const profile = getOrCreateProfile(playerId);
    const stats = statsForWithRules(playerId, rules);
    const reasons: string[] = [];
    const warnings: string[] = [];
    const firstSeenMs = Date.parse(profile.firstSeenAt);
    const cutoffMs = Date.parse(rules.seasonCutoffAt);
    const minAgeMs = Math.max(0, rules.minAccountAgeDays) * 86_400_000;

    if (!profile.walletAuthenticated) reasons.push('wallet not authenticated with SIWS');
    if (!Number.isFinite(firstSeenMs) || !Number.isFinite(cutoffMs) || firstSeenMs > cutoffMs) {
      reasons.push('account was not created before the season cutoff');
    }
    if (Number.isFinite(firstSeenMs) && Date.now() - firstSeenMs < minAgeMs) {
      reasons.push(`account younger than ${rules.minAccountAgeDays} day minimum`);
    }
    if (stats.completedMatches < rules.minCompletedMatches) reasons.push(`requires at least ${rules.minCompletedMatches} completed ranked matches`);
    if (stats.uniqueOpponents < rules.minUniqueOpponents) reasons.push(`requires at least ${rules.minUniqueOpponents} unique opponents`);
    if (stats.countedMatches < rules.minCompletedMatches) reasons.push('too many matches are against the same opponents to count fully');

    if (stats.maxMatchesAgainstSingleOpponent > rules.maxCountedMatchesPerOpponent) warnings.push('repeated same-opponent farming signal');
    if (stats.forfeitRate > rules.maxForfeitRate) warnings.push('abnormal forfeit/timeout rate');
    if (stats.shortMatchRate > rules.maxShortMatchRate) warnings.push('abnormal ultra-short match rate');
    if (stats.completedMatches >= rules.minCompletedMatches && (stats.wins === 0 || stats.losses === 0)) {
      warnings.push('low win/loss diversity; requires manual review');
    }
    if (rules.fingerprintingEnabled && stats.strongestIdentityClusterSize > rules.maxIdentityClusterSize) {
      warnings.push('identity/device/IP hash cluster above threshold');
    }
    for (const flag of activeFlags(profile)) warnings.push(`active flag: ${flag.reason}`);

    let status: EligibilityStatus = 'eligible';
    if (profile.banned) status = 'banned';
    else if (profile.adminExcluded || rules.adminExcludedWallets.includes(playerId) || isTestWallet(playerId, rules)) status = 'admin_excluded';
    else if (reasons.length > 0) status = 'ineligible';
    else if (warnings.length > 0) status = 'flagged_review';

    return {
      playerId,
      status,
      eligible: status === 'eligible',
      reasons,
      warnings,
      stats,
      profile: safePlayerSummary(profile),
      evaluatedAt: nowIso(),
    };
  },

  createSeasonSnapshot(seasonId: string, rules: EligibilityRules, options?: { save?: boolean; limit?: number }): SeasonSnapshot {
    const ranked = ladder.leaderboard(options?.limit ?? 1000);
    const rows: SeasonSnapshotRow[] = ranked.map((player, index) => {
      const evaluation = this.evaluatePlayer(player.id, { ...rules, seasonId });
      return {
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        status: evaluation.status,
        eligible: evaluation.eligible,
        reasons: [...evaluation.reasons],
        warnings: [...evaluation.warnings],
        stats: { ...evaluation.stats },
      };
    });

    const eligibleIds = new Set(rows.filter((row) => row.eligible).map((row) => row.playerId));
    const eligiblePlayers = ranked.filter((player) => eligibleIds.has(player.id));
    const { fingerprintSalt: _fingerprintSalt, ...safeRules } = { ...rules, seasonId };
    void _fingerprintSalt;
    const snapshot: SeasonSnapshot = {
      seasonId,
      generatedAt: nowIso(),
      rulesSummary: safeRules,
      rows,
      eligiblePlayers,
      flaggedCount: rows.filter((row) => row.status === 'flagged_review').length,
      ineligibleCount: rows.filter((row) => row.status === 'ineligible').length,
      bannedOrExcludedCount: rows.filter((row) => row.status === 'banned' || row.status === 'admin_excluded').length,
    };

    if (options?.save !== false) snapshots.set(seasonId, snapshot);
    return snapshot;
  },

  getLatestSnapshot(seasonId: string): SeasonSnapshot | undefined {
    const snapshot = snapshots.get(seasonId);
    return snapshot
      ? {
          ...snapshot,
          rulesSummary: { ...snapshot.rulesSummary },
          rows: snapshot.rows.map((row) => ({ ...row, reasons: [...row.reasons], warnings: [...row.warnings], stats: { ...row.stats } })),
          eligiblePlayers: snapshot.eligiblePlayers.map((player) => ({ ...player })),
        }
      : undefined;
  },

  buildEligiblePayoutPlan(config: SeasonConfig, snapshot?: SeasonSnapshot): PayoutPlan {
    const sourceSnapshot = snapshot ?? snapshots.get(config.seasonId);
    if (!sourceSnapshot) throw new Error('season snapshot required before payout planning');
    return buildPayoutPlanFromPlayers(config, sourceSnapshot.eligiblePlayers, 'eligible-season-snapshot');
  },

  _statsForTests(playerId: string): EligibilityStats {
    return statsFor(playerId);
  },

  _reset() {
    profiles.clear();
    snapshots.clear();
  },
};
