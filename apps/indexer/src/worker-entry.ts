import { Connection, PublicKey } from "@solana/web3.js";
import { getProgramIds, loadEnv } from "./config/env.js";
import { createPool } from "./db/pool.js";
import { runBackfillBatch } from "./ingestion/backfill.js";
import { startLiveIngestion } from "./ingestion/live.js";
import { runReconcilerOnce } from "./ingestion/reconciler.js";
import { createLogger } from "./utils/logger.js";

const env = loadEnv();
const log = createLogger(env);
const pool = createPool(env.DATABASE_URL);
const ids = getProgramIds(env);
const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");

const mode = process.env.WORKER_MODE ?? "backfill";

async function main() {
  const programIds = [
    new PublicKey(ids.factory),
    new PublicKey(ids.mixer),
    new PublicKey(ids.staking),
    new PublicKey(ids.payment),
  ];

  if (mode === "live") {
    const { stop } = startLiveIngestion(
      pool,
      connection,
      ids,
      env,
      log,
      programIds,
    );
    process.on("SIGINT", async () => {
      await stop();
      process.exit(0);
    });
    return;
  }

  if (mode === "reconciler") {
    const intervalMs = Number(process.env.RECONCILER_INTERVAL_MS ?? 300_000);
    setInterval(async () => {
      try {
        await runReconcilerOnce(pool, connection, ids, env, log, programIds);
      } catch (e) {
        log.error(e);
      }
    }, intervalMs);
    await runReconcilerOnce(pool, connection, ids, env, log, programIds);
    return;
  }

  for (;;) {
    let processed = 0;
    for (const programId of programIds) {
      const out = await runBackfillBatch(
        pool,
        connection,
        ids,
        env,
        log,
        programId,
      );
      processed += out.processed;
    }
    if (processed === 0) {
      log.info("backfill caught up, sleeping");
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
