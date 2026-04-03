import { Connection, PublicKey } from "@solana/web3.js";
import type pg from "pg";
import type { ProgramIds } from "../types/programs.js";
import type { Logger } from "../utils/logger.js";
import { ingestParsedTransaction } from "../services/ingest.js";
import { fetchParsedTransaction } from "./fetch-tx.js";
import {
  getCheckpoint,
  upsertCheckpoint,
} from "../repositories/checkpoints.js";
import type { Env } from "../config/env.js";

export async function runBackfillBatch(
  pool: pg.Pool,
  connection: Connection,
  ids: ProgramIds,
  env: Env,
  log: Logger,
  programId: PublicKey,
  workerName = `backfill:${programId.toBase58()}`,
): Promise<{
  processed: number;
  maxSlot: bigint;
  lastSignature: string | null;
}> {
  const cp = await getCheckpoint(pool, workerName);
  const before = cp.lastSignature ?? undefined;
  const sigs = await connection.getSignaturesForAddress(programId, {
    limit: env.BACKFILL_BATCH_SIZE,
    before,
  });
  let maxSlot = cp.lastProcessedSlot;
  let processed = 0;
  let lastSig: string | null = null;
  for (const s of sigs) {
    if (s.err) continue;
    const tx = await fetchParsedTransaction(connection, s.signature);
    if (!tx) continue;
    await ingestParsedTransaction(pool, ids, tx, s.signature, "finalized");
    processed++;
    lastSig = s.signature;
    if (BigInt(tx.slot) > maxSlot) maxSlot = BigInt(tx.slot);
  }
  if (sigs.length > 0) {
    const oldestInPage = sigs[sigs.length - 1]!.signature;
    await upsertCheckpoint(pool, workerName, maxSlot, {
      lastSignature: oldestInPage,
    });
  }
  log.info(
    {
      worker: workerName,
      processed,
      maxSlot: maxSlot.toString(),
      lastSignature: lastSig,
      program: programId.toBase58(),
    },
    "backfill batch",
  );
  return { processed, maxSlot, lastSignature: lastSig };
}
