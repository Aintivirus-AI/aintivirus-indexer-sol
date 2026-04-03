import type pg from "pg";

export async function getCheckpoint(
  pool: pg.Pool,
  workerName: string,
): Promise<{
  lastProcessedSlot: bigint;
  lastFinalizedSlot: bigint;
  lastSignature: string | null;
}> {
  const { rows } = await pool.query<{
    last_processed_slot: string;
    last_finalized_slot: string;
    last_signature: string | null;
  }>(
    `SELECT last_processed_slot, last_finalized_slot, last_signature FROM indexer_checkpoints WHERE worker_name = $1`,
    [workerName],
  );
  if (rows.length === 0) {
    return { lastProcessedSlot: 0n, lastFinalizedSlot: 0n, lastSignature: null };
  }
  return {
    lastProcessedSlot: BigInt(rows[0]!.last_processed_slot),
    lastFinalizedSlot: BigInt(rows[0]!.last_finalized_slot),
    lastSignature: rows[0]!.last_signature,
  };
}

export async function upsertCheckpoint(
  db: pg.Pool | pg.PoolClient,
  workerName: string,
  lastProcessedSlot: bigint,
  opts?: { lastFinalizedSlot?: bigint; lastSignature?: string | null },
): Promise<void> {
  await db.query(
    `INSERT INTO indexer_checkpoints (worker_name, last_processed_slot, last_finalized_slot, last_signature, updated_at)
     VALUES ($1, $2::bigint, COALESCE($3::bigint, $2::bigint), $4, NOW())
     ON CONFLICT (worker_name) DO UPDATE SET
       last_processed_slot = EXCLUDED.last_processed_slot,
       last_finalized_slot = COALESCE(EXCLUDED.last_finalized_slot, indexer_checkpoints.last_finalized_slot),
       last_signature = COALESCE(EXCLUDED.last_signature, indexer_checkpoints.last_signature),
       updated_at = NOW()`,
    [
      workerName,
      lastProcessedSlot.toString(),
      opts?.lastFinalizedSlot?.toString() ?? null,
      opts?.lastSignature ?? null,
    ],
  );
}
