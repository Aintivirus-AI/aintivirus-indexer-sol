DROP INDEX IF EXISTS idx_mixer_deposits_pool_leaf;

ALTER TABLE mixer_deposits
  DROP COLUMN IF EXISTS leaf_index;
