-- Chronofrost PvP persistence target schema.
-- The current package keeps PvP in memory for local development only. Before
-- public ranked seasons or studio-funded $AETHER prizes, replace the in-memory
-- adapters with Postgres tables equivalent to these.
--
-- Invariant: ranked rewards are studio-funded only. No table below records a
-- player stake, player entry fee, or player-funded prize pot.

CREATE TABLE IF NOT EXISTS pvp_players (
  player_id TEXT PRIMARY KEY,              -- SIWS-verified wallet address
  display_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  wallet_authenticated BOOLEAN NOT NULL DEFAULT TRUE,
  eligibility_status TEXT NOT NULL DEFAULT 'ineligible'
    CHECK (eligibility_status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  admin_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pvp_player_identity_signals (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  -- Salted hashes only. Do not store raw IP/device/user-agent values here.
  ip_hash TEXT,
  device_hash TEXT,
  user_agent_hash TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ip_hash IS NOT NULL OR device_hash IS NOT NULL OR user_agent_hash IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pvp_identity_ip_hash ON pvp_player_identity_signals(ip_hash) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pvp_identity_device_hash ON pvp_player_identity_signals(device_hash) WHERE device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pvp_identity_ua_hash ON pvp_player_identity_signals(user_agent_hash) WHERE user_agent_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS pvp_player_flags (
  flag_id UUID PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_by TEXT,
  cleared_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pvp_flags_active ON pvp_player_flags(player_id) WHERE cleared_at IS NULL;

CREATE TABLE IF NOT EXISTS pvp_seasons (
  season_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'snapshot', 'paid', 'cancelled')),
  prize_pool_raw NUMERIC(78, 0) NOT NULL DEFAULT 0,
  token_decimals INTEGER NOT NULL DEFAULT 6,
  distribution_json JSONB NOT NULL,
  funded_by TEXT NOT NULL DEFAULT 'studio-treasury',
  eligibility_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  cutoff_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (funded_by = 'studio-treasury')
);

CREATE TABLE IF NOT EXISTS pvp_matches (
  match_id UUID PRIMARY KEY,
  season_id TEXT REFERENCES pvp_seasons(season_id),
  seed BIGINT NOT NULL,
  p1_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  p2_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  status TEXT NOT NULL CHECK (status IN ('active', 'complete', 'cancelled')),
  current_turn_player_id TEXT,
  winner_id TEXT,
  completion_reason TEXT CHECK (completion_reason IN ('combat', 'forfeit', 'timeout')),
  final_hp_json JSONB,
  action_count INTEGER NOT NULL DEFAULT 0,
  turn_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (p1_id <> p2_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_player_1 ON pvp_matches(p1_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_player_2 ON pvp_matches(p2_id);
CREATE INDEX IF NOT EXISTS idx_pvp_matches_season ON pvp_matches(season_id);

CREATE TABLE IF NOT EXISTS pvp_match_actions (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES pvp_matches(match_id),
  turn_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  action TEXT NOT NULL CHECK (action IN ('attack', 'freeze', 'defend')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, turn_number)
);

CREATE TABLE IF NOT EXISTS pvp_rating_events (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES pvp_matches(match_id),
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  rating_before INTEGER NOT NULL,
  rating_delta INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS pvp_match_quality_metrics (
  match_id UUID PRIMARY KEY REFERENCES pvp_matches(match_id),
  action_count INTEGER NOT NULL,
  duration_seconds INTEGER,
  was_short_match BOOLEAN NOT NULL DEFAULT FALSE,
  was_forfeit_or_timeout BOOLEAN NOT NULL DEFAULT FALSE,
  repeated_pair_count_for_p1 INTEGER NOT NULL DEFAULT 0,
  repeated_pair_count_for_p2 INTEGER NOT NULL DEFAULT 0,
  suspicious_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pvp_season_snapshots (
  snapshot_id UUID PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  generated_by_admin TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rules_summary_json JSONB NOT NULL,
  snapshot_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pvp_season_snapshot_rows (
  snapshot_id UUID NOT NULL REFERENCES pvp_season_snapshots(snapshot_id),
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  rank INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  eligibility_status TEXT NOT NULL
    CHECK (eligibility_status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  eligible BOOLEAN NOT NULL,
  completed_matches INTEGER NOT NULL,
  unique_opponents INTEGER NOT NULL,
  forfeit_rate NUMERIC(5, 4) NOT NULL,
  short_match_rate NUMERIC(5, 4) NOT NULL,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_id, player_id),
  UNIQUE (snapshot_id, rank)
);

CREATE TABLE IF NOT EXISTS pvp_payout_plans (
  plan_id UUID PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES pvp_seasons(season_id),
  snapshot_id UUID REFERENCES pvp_season_snapshots(snapshot_id),
  created_by_admin TEXT NOT NULL,
  prize_pool_raw NUMERIC(78, 0) NOT NULL,
  plan_json JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected', 'cancelled', 'executed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by_admin TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by_admin TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancelled_by_admin TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  execution_tx_signature TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_pvp_payout_plans_season_status ON pvp_payout_plans(season_id, status);

CREATE TABLE IF NOT EXISTS pvp_payout_transactions (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES pvp_payout_plans(plan_id),
  recipient_player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  amount_raw NUMERIC(78, 0) NOT NULL,
  tx_signature TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Latest anti-sybil eligibility evaluation per player per season. This is the
-- durable target for PvpEligibilityRepository.saveEvaluation. It is an
-- evaluation cache, not a payout authority: snapshots + payout plans remain the
-- admin-gated source of truth for any studio-funded reward.
CREATE TABLE IF NOT EXISTS pvp_eligibility_evaluations (
  season_id TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES pvp_players(player_id),
  status TEXT NOT NULL
    CHECK (status IN ('eligible', 'ineligible', 'flagged_review', 'banned', 'admin_excluded')),
  eligible BOOLEAN NOT NULL,
  evaluation_json JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, player_id)
);

-- Mainnet prototype cosmetic shop storage. These tables record server-created
-- orders and verified player-signed SPL transfers only; they do not authorize
-- backend movement of player tokens and do not represent rewards, staking, or
-- any player-funded prize pool.
CREATE TABLE IF NOT EXISTS shop_orders (
  order_id UUID PRIMARY KEY,
  buyer_wallet TEXT NOT NULL,
  item_id TEXT NOT NULL,
  mint TEXT NOT NULL,
  amount_raw NUMERIC(78, 0) NOT NULL,
  decimals INTEGER NOT NULL,
  treasury_token_account TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirming', 'confirmed', 'expired', 'failed')),
  tx_signature TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_buyer_wallet ON shop_orders(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status_expires ON shop_orders(status, expires_at);

CREATE TABLE IF NOT EXISTS shop_inventory_grants (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('aether')),
  order_id UUID NOT NULL REFERENCES shop_orders(order_id),
  tx_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id),
  UNIQUE (wallet, item_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_inventory_wallet ON shop_inventory_grants(wallet);
