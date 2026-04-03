import { Connection, PublicKey } from "@solana/web3.js";
import { Router, type NextFunction, type Request, type Response } from "express";
import type pg from "pg";
import type { Env } from "../config/env.js";
import { runReconcilerOnce } from "../ingestion/reconciler.js";
import { getCheckpoint } from "../repositories/checkpoints.js";
import { rebuildDerivedFromRaw } from "../services/rebuild.js";
import type { ProgramIds } from "../types/programs.js";
import type { Logger } from "../utils/logger.js";

function requireAdmin(env: Env) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!env.ADMIN_API_KEY) {
      res.status(503).json({ error: "Admin API disabled" });
      return;
    }
    const key = req.header("x-admin-key");
    if (key !== env.ADMIN_API_KEY) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

export function adminRouter(
  pool: pg.Pool,
  ids: ProgramIds,
  env: Env,
  connection: Connection,
  log: Logger,
): Router {
  const r = Router();
  const gate = requireAdmin(env);

  r.get("/indexer/health", async (_req, res) => {
    const backfill = await getCheckpoint(pool, `backfill:${ids.factory}`);
    const live = await getCheckpoint(pool, "live");
    res.json({
      status: "ok",
      checkpoints: {
        backfill: { lastProcessedSlot: backfill.lastProcessedSlot.toString() },
        live: { lastProcessedSlot: live.lastProcessedSlot.toString() },
      },
    });
  });

  r.get("/indexer/checkpoints", gate, async (_req, res) => {
    const { rows } = await pool.query(`SELECT * FROM indexer_checkpoints`);
    res.json({ checkpoints: rows });
  });

  r.post("/replay", gate, async (_req, res) => {
    await rebuildDerivedFromRaw(pool, ids);
    res.json({ ok: true });
  });

  r.post("/reconcile", gate, async (_req, res) => {
    const programIds = [ids.factory, ids.mixer, ids.staking, ids.payment].map((x) => new PublicKey(x));
    const out = await runReconcilerOnce(
      pool,
      connection,
      ids,
      env,
      log,
      programIds,
    );
    res.json(out);
  });

  return r;
}
