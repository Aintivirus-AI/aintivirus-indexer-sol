-- Checkpoints per worker
CREATE TABLE IF NOT EXISTS indexer_checkpoints (
  worker_name TEXT PRIMARY KEY,
  last_processed_slot BIGINT NOT NULL DEFAULT 0,
  last_finalized_slot BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalized decoded events (namespace event_type e.g. mixer.DepositStateEvent)
CREATE TABLE IF NOT EXISTS raw_events (
  id BIGSERIAL PRIMARY KEY,
  program_id TEXT NOT NULL,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  block_time BIGINT,
  tx_index BIGINT,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL,
  parser_version TEXT NOT NULL DEFAULT '1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (signature, outer_instruction_index, inner_instruction_index, event_type)
);

CREATE INDEX IF NOT EXISTS idx_raw_events_slot ON raw_events(slot);
CREATE INDEX IF NOT EXISTS idx_raw_events_program ON raw_events(program_id);
CREATE INDEX IF NOT EXISTS idx_raw_events_sig ON raw_events(signature);

-- Mixer pool state (mixer PDA = pool address)
CREATE TABLE IF NOT EXISTS mixer_pools (
  pool TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  latest_root TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mixer_deposits (
  id BIGSERIAL PRIMARY KEY,
  pool TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  commitment TEXT NOT NULL,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  depositor TEXT,
  tx_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pool, commitment),
  UNIQUE(signature, outer_instruction_index, inner_instruction_index)
);

CREATE INDEX IF NOT EXISTS idx_mixer_deposits_pool_slot ON mixer_deposits(pool, slot);

CREATE TABLE IF NOT EXISTS mixer_nullifiers (
  id BIGSERIAL PRIMARY KEY,
  nullifier_hash TEXT NOT NULL UNIQUE,
  pool TEXT,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mixer_roots (
  id BIGSERIAL PRIMARY KEY,
  pool TEXT NOT NULL,
  root TEXT NOT NULL,
  slot BIGINT NOT NULL,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mixer_roots_pool ON mixer_roots(pool, slot DESC);

-- Staking
CREATE TABLE IF NOT EXISTS staking_events (
  id BIGSERIAL PRIMARY KEY,
  program_id TEXT NOT NULL,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  user_wallet TEXT,
  asset TEXT,
  season_id BIGINT,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signature, outer_instruction_index, inner_instruction_index, event_type)
);

CREATE INDEX IF NOT EXISTS idx_staking_events_wallet ON staking_events(user_wallet);
CREATE INDEX IF NOT EXISTS idx_staking_events_season ON staking_events(season_id);

CREATE TABLE IF NOT EXISTS staking_positions (
  id BIGSERIAL PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  asset TEXT NOT NULL,
  season_id BIGINT NOT NULL,
  staked_amount NUMERIC NOT NULL DEFAULT 0,
  reward_debt NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_wallet, asset, season_id)
);

CREATE TABLE IF NOT EXISTS staking_seasons (
  season_id BIGINT PRIMARY KEY,
  start_time BIGINT,
  end_time BIGINT,
  status TEXT NOT NULL,
  total_staked NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
