ALTER TABLE mixer_deposits
  ADD COLUMN IF NOT EXISTS tx_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mixer_deposits_pool_tx_time ON mixer_deposits(pool, tx_time);
