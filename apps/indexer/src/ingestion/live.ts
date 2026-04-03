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

const WORKER = "live";

export function startLiveIngestion(
  pool: pg.Pool,
  connection: Connection,
  ids: ProgramIds,
  env: Env,
  log: Logger,
  programIds: PublicKey[],
): { stop: () => Promise<void> } {
  const subs: number[] = [];
  for (const pid of programIds) {
    const id = connection.onLogs(
      pid,
      async (logs) => {
        try {
          if (logs.err) return;
          const cp = await getCheckpoint(pool, WORKER);
          const tx = await fetchParsedTransaction(connection, logs.signature);
          if (!tx) return;
          const slot = BigInt(tx.slot);
          const minSlot =
            cp.lastProcessedSlot > BigInt(env.OVERLAP_SLOTS)
              ? cp.lastProcessedSlot - BigInt(env.OVERLAP_SLOTS)
              : 0n;
          if (slot < minSlot) {
            log.debug({ sig: logs.signature, slot: tx.slot }, "skip old slot");
          }
          await ingestParsedTransaction(
            pool,
            ids,
            tx,
            logs.signature,
            "confirmed",
          );
          await upsertCheckpoint(pool, WORKER, BigInt(tx.slot), {
            lastSignature: logs.signature,
          });
        } catch (err) {
          log.error({ err, sig: logs.signature }, "live ingest error");
        }
      },
      "confirmed",
    );
    subs.push(id);
  }
  log.info(
    { programs: programIds.map((p) => p.toBase58()) },
    "live logs subscription started",
  );
  return {
    stop: async () => {
      for (const id of subs) {
        await connection.removeOnLogsListener(id);
      }
    },
  };
}
