ALTER TABLE indexer_checkpoints
  ADD COLUMN IF NOT EXISTS last_signature TEXT;
