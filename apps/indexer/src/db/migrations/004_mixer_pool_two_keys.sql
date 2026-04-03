ALTER TABLE mixer_pools
  ADD COLUMN IF NOT EXISTS mixer TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mixer_pools_mixer ON mixer_pools(mixer) WHERE mixer IS NOT NULL;
