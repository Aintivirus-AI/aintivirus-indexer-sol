DROP INDEX IF EXISTS idx_mixer_withdrawals_pool_slot;

ALTER TABLE mixer_withdrawals
  DROP COLUMN IF EXISTS pool;
