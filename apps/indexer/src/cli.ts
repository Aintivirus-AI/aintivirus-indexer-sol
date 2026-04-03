#!/usr/bin/env node
import { Command } from "commander";
import { Connection } from "@solana/web3.js";
import { getProgramIds, loadEnv } from "./config/env.js";
import { createPool } from "./db/pool.js";
import { rebuildDerivedFromRaw } from "./services/rebuild.js";
import { createLogger } from "./utils/logger.js";
import { ingestParsedTransaction } from "./services/ingest.js";
import { fetchParsedTransaction } from "./ingestion/fetch-tx.js";

const program = new Command();
program.name("aintivirus-indexer").description("Indexer CLI");

program
  .command("migrate")
  .description("Run SQL migrations")
  .action(async () => {
    const { spawn } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const p = spawn("pnpm", ["exec", "tsx", "src/db/run-migrations.ts"], {
        stdio: "inherit",
        shell: true,
        cwd: process.cwd(),
      });
      p.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`exit ${code}`)),
      );
    });
  });

program
  .command("rebuild:mixer")
  .description("Rebuild mixer + staking derived tables from raw_events")
  .action(async () => {
    const env = loadEnv();
    const log = createLogger(env);
    const pool = createPool(env.DATABASE_URL);
    const ids = getProgramIds(env);
    log.info("rebuilding derived state from raw_events");
    await rebuildDerivedFromRaw(pool, ids);
    log.info("done");
    await pool.end();
  });

program
  .command("rebuild:staking")
  .description("Alias: same as rebuild:mixer (rebuilds all derived tables)")
  .action(async () => {
    const env = loadEnv();
    const log = createLogger(env);
    const pool = createPool(env.DATABASE_URL);
    const ids = getProgramIds(env);
    await rebuildDerivedFromRaw(pool, ids);
    log.info("done");
    await pool.end();
  });

program
  .command("checkpoints")
  .description("Show indexer checkpoints and latest indexed slots")
  .action(async () => {
    const env = loadEnv();
    const pool = createPool(env.DATABASE_URL);
    const [checkpoints, rawMax, mixerMax, stakingMax] = await Promise.all([
      pool.query<{
        worker_name: string;
        last_processed_slot: string;
        last_finalized_slot: string;
        last_signature: string | null;
        updated_at: string;
      }>(
        `SELECT worker_name, last_processed_slot, last_finalized_slot, last_signature, updated_at
         FROM indexer_checkpoints
         ORDER BY worker_name ASC`,
      ),
      pool.query<{ max_slot: string | null }>(
        `SELECT MAX(slot)::text AS max_slot FROM raw_events`,
      ),
      pool.query<{ max_slot: string | null }>(
        `SELECT MAX(slot)::text AS max_slot FROM mixer_deposits`,
      ),
      pool.query<{ max_slot: string | null }>(
        `SELECT MAX(slot)::text AS max_slot FROM staking_events`,
      ),
    ]);

    const payload = {
      checkpoints: checkpoints.rows.map((r) => ({
        worker: r.worker_name,
        lastProcessedSlot: r.last_processed_slot,
        lastFinalizedSlot: r.last_finalized_slot,
        lastSignature: r.last_signature,
        updatedAt: r.updated_at,
      })),
      latestSlots: {
        rawEvents: rawMax.rows[0]?.max_slot ?? null,
        mixerDeposits: mixerMax.rows[0]?.max_slot ?? null,
        stakingEvents: stakingMax.rows[0]?.max_slot ?? null,
      },
    };
    console.log(JSON.stringify(payload, null, 2));
    await pool.end();
  });

program
  .command("replay:tx")
  .description("Ingest a single transaction by signature")
  .argument("<signature>", "Transaction signature")
  .action(async (signature: string) => {
    const env = loadEnv();
    const pool = createPool(env.DATABASE_URL);
    const ids = getProgramIds(env);
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    const tx = await fetchParsedTransaction(connection, signature);
    if (!tx) throw new Error("Transaction not found");
    await ingestParsedTransaction(pool, ids, tx, signature, "finalized");
    await pool.end();
  });

program
  .command("replay:slots")
  .description(
    "Fetch each block in [from,to] and ingest transactions (RPC-heavy)",
  )
  .requiredOption("--from <slot>", "Start slot (inclusive)")
  .requiredOption("--to <slot>", "End slot (inclusive)")
  .action(async (opts: { from: string; to: string }) => {
    const env = loadEnv();
    const log = createLogger(env);
    const pool = createPool(env.DATABASE_URL);
    const ids = getProgramIds(env);
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    const from = Number(opts.from);
    const to = Number(opts.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      throw new Error("invalid range");
    }
    let n = 0;
    for (let slot = from; slot <= to; slot++) {
      const block = await connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
      });
      if (!block) continue;
      for (const tx of block.transactions) {
        const sig = tx.transaction.signatures[0];
        if (!sig) continue;
        const parsed = await fetchParsedTransaction(connection, sig);
        if (!parsed) continue;
        await ingestParsedTransaction(pool, ids, parsed, sig, "finalized");
        n++;
      }
      if (slot % 50 === 0)
        log.info({ slot, ingested: n }, "replay:slots progress");
    }
    log.info({ ingested: n }, "replay:slots done");
    await pool.end();
  });

program.parse();
