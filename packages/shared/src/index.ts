export type ChronofrostCurrency = 'gold' | 'frost_shard' | 'aether';
export type PvpAction = 'attack' | 'freeze' | 'defend';
export type PvpMatchStatus = 'active' | 'complete';
export type PvpEligibilityStatus = 'eligible' | 'ineligible' | 'flagged_review' | 'banned' | 'admin_excluded';

export const SAFE_TOKEN_INVARIANTS = Object.freeze({
  playerStaking: false,
  playerFundedPrizePools: false,
  pvpBetting: false,
  prizesFundedBy: 'studio-treasury' as const,
});

export type ShopQuote = {
  orderId: string;
  itemId: string;
  buyerWallet: string;
  priceRaw: string;
  mint: string;
  treasuryTokenAccount: string;
  expiresAt: string;
};

export type PvpPublicMatchState = {
  matchId: string;
  status: PvpMatchStatus;
  viewerId: string;
  currentTurnPlayerId: string | null;
  yourTurn: boolean;
  turnDeadlineAt: string | null;
  winnerId: string | null;
};
