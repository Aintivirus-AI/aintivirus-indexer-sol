CREATE TABLE IF NOT EXISTS mixer_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  mixer TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  recipient TEXT NOT NULL,
  nullifier_hash TEXT NOT NULL UNIQUE,
  fee NUMERIC NOT NULL DEFAULT 0,
  relayer TEXT,
  signature TEXT NOT NULL,
  slot BIGINT NOT NULL,
  outer_instruction_index INT NOT NULL DEFAULT 0,
  inner_instruction_index INT NOT NULL DEFAULT -1,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signature, outer_instruction_index, inner_instruction_index)
);

CREATE INDEX IF NOT EXISTS idx_mixer_withdrawals_mixer_slot ON mixer_withdrawals(mixer, slot);
