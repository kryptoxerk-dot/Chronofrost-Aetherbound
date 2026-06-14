// Season prize pool — STUDIO-FUNDED ONLY.
//
// IMPORTANT LEGAL/DESIGN INVARIANT:
// The prize pool is funded entirely by the studio treasury that YOU control.
// Players NEVER contribute funds to this pool. There is no entry fee that feeds
// the pool, no player-vs-player stake, and no pooling of player money. This is
// the difference between a sponsored esports prize (legitimate) and player-
// funded wagering (regulated gambling in most jurisdictions). This module is
// written so that distinction is enforced by structure, not just intention:
// the pool amount comes from server/admin config, and there is no code path that
// adds player funds to it.
//
// Payouts compute top eligible finishers by skill rating at season end and
// produce a payout PLAN. Actually sending $AETHER is a separate, deliberate
// treasury action (the server signs transfers from the studio treasury wallet —
// never from players). Keeping payout-planning and payout-execution separate
// means a human/ops step gates real funds leaving the treasury.

import { ladder, type RankedPlayer } from './ladder.js';

// Configure this from your studio treasury. Amounts are in raw token units
// (e.g. 6 decimals -> 1 $AETHER = 1_000_000). Set via env/admin in production.
export type SeasonConfig = {
  seasonId: string;
  // distribution among top eligible finishers, must sum to <= 1.0 of the pool
  distribution: number[]; // e.g. [0.5, 0.3, 0.2] for top 3
  prizePoolRaw: string;   // total studio-funded pool, raw units
  decimals: number;
  fundedByStudio: true;   // type-level reminder; there is no other funding source
};

export type PrizePayout = {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  amountRaw: string;
};

export type PayoutPlan = {
  seasonId: string;
  prizePoolRaw: string;
  fundedBy: 'studio-treasury';
  payoutSource: 'eligible-season-snapshot' | 'raw-ladder-dev';
  payouts: PrizePayout[];
  note: string;
};

function validateDistribution(config: SeasonConfig): void {
  if (!/^\d+$/.test(config.prizePoolRaw)) throw new Error('prizePoolRaw must be a non-negative integer string');
  const totalShare = config.distribution.reduce((a, b) => a + b, 0);
  if (totalShare > 1.0000001) {
    throw new Error('distribution exceeds 100% of the prize pool');
  }
}

export function buildPayoutPlanFromPlayers(
  config: SeasonConfig,
  rankedPlayers: RankedPlayer[],
  payoutSource: PayoutPlan['payoutSource'] = 'eligible-season-snapshot',
): PayoutPlan {
  validateDistribution(config);

  const pool = BigInt(config.prizePoolRaw);
  const top = rankedPlayers
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, config.distribution.length);

  const payouts: PrizePayout[] = top.map((p: RankedPlayer, i: number) => {
    // integer-safe share: floor(pool * share_bp / 10000)
    const bp = BigInt(Math.round(config.distribution[i] * 10000));
    const amount = (pool * bp) / 10000n;
    return {
      rank: i + 1,
      playerId: p.id,
      playerName: p.name,
      rating: p.rating,
      amountRaw: amount.toString(),
    };
  });

  return {
    seasonId: config.seasonId,
    prizePoolRaw: config.prizePoolRaw,
    fundedBy: 'studio-treasury',
    payoutSource,
    payouts,
    note:
      'Prize pool funded entirely by the studio treasury. No player funds are ' +
      'pooled or wagered. Entry to ranked is free/skill-based. Execute payouts ' +
      'as a separate, signed treasury transfer after eligibility review.',
  };
}

/**
 * Dev fallback: raw ladder payout plan. Production/admin routes should prefer
 * an eligibility snapshot via buildPayoutPlanFromPlayers(..., eligiblePlayers).
 */
export function buildPayoutPlan(config: SeasonConfig): PayoutPlan {
  return buildPayoutPlanFromPlayers(config, ladder.leaderboard(config.distribution.length), 'raw-ladder-dev');
}
