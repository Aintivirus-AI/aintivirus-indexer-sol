import { Connection, PublicKey } from "@solana/web3.js";
import type pg from "pg";
import type { Env } from "../config/env.js";
import { runBackfillBatch } from "./backfill.js";
import type { Logger } from "../utils/logger.js";
import type { ProgramIds } from "../types/programs.js";
import {
  getCheckpoint,
  upsertCheckpoint,
} from "../repositories/checkpoints.js";

const WORKER = "reconciler";

/** Compare chain slot vs checkpoints; optionally align last_finalized_slot */
export async function runReconcilerOnce(
  pool: pg.Pool,
  connection: Connection,
  ids: ProgramIds,
  env: Env,
  log: Logger,
  programIds: PublicKey[],
): Promise<{
  chainSlot: bigint;
  backfillSlot: bigint;
  liveSlot: bigint;
  catchupProcessed: number;
}> {
  const chainSlot = BigInt(await connection.getSlot("finalized"));

  const backfillByProgram = await Promise.all(
    programIds.map((pid) => getCheckpoint(pool, `backfill:${pid.toBase58()}`)),
  );
  const backfillSlot = backfillByProgram.reduce(
    (min, cp) => (cp.lastProcessedSlot < min ? cp.lastProcessedSlot : min),
    chainSlot,
  );
  const live = await getCheckpoint(pool, "live");
  const lagThreshold = BigInt(env.OVERLAP_SLOTS);
  const backfillLag = chainSlot > backfillSlot ? chainSlot - backfillSlot : 0n;
  const catchupBatches = Number(process.env.RECONCILER_CATCHUP_BATCHES ?? 1);
  let catchupProcessed = 0;

  if (backfillLag > lagThreshold) {
    for (let i = 0; i < catchupBatches; i++) {
      for (const programId of programIds) {
        const out = await runBackfillBatch(
          pool,
          connection,
          ids,
          env,
          log,
          programId,
        );
        catchupProcessed += out.processed;
      }
      if (catchupProcessed === 0) break;
    }
  }

  log.info(
    {
      chainSlot: chainSlot.toString(),
      backfill: backfillSlot.toString(),
      live: live.lastProcessedSlot.toString(),
      backfillLag: backfillLag.toString(),
      catchupProcessed,
    },
    "reconciler tick",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await upsertCheckpoint(client, WORKER, chainSlot, {
      lastFinalizedSlot: chainSlot,
    });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return {
    chainSlot,
    backfillSlot,
    liveSlot: live.lastProcessedSlot,
    catchupProcessed,
  };
}
