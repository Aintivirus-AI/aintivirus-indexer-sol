CREATE TABLE IF NOT EXISTS staking_rewards_added (
  id BIGSERIAL PRIMARY KEY,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  season_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signature, outer_instruction_index, inner_instruction_index)
);

CREATE INDEX IF NOT EXISTS idx_staking_rewards_added_season ON staking_rewards_added(season_id);
