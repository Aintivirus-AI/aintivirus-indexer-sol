import { Router } from "express";
import type pg from "pg";
import { PublicKey } from "@solana/web3.js";
import { mixerPoolPda } from "../utils/pubkey.js";
import type { ProgramIds } from "../types/programs.js";

export function mixerRouter(pool: pg.Pool, ids: ProgramIds): Router {
  const r = Router();
  const mixerProgram = new PublicKey(ids.mixer);

  r.get("/pools/:asset/:amount/deposits", async (req, res) => {
    try {
      const asset = new PublicKey(req.params.asset);
      const amount = BigInt(req.params.amount);
      const poolPda = mixerPoolPda(mixerProgram, asset, amount);
      const { rows } = await pool.query<{
        commitment: string;
        slot: string;
      }>(
        `SELECT commitment, slot FROM mixer_deposits
         WHERE pool = $1
         ORDER BY tx_time DESC NULLS LAST, slot DESC`,
        [poolPda.toBase58()],
      );
      const { rows: poolRow } = await pool.query<{ pool: string; asset: string; amount: string }>(
        `SELECT pool, asset, amount FROM mixer_pools WHERE mixer = $1`,
        [poolPda.toBase58()],
      );
      const meta = poolRow[0];
      res.json({
        mixer: poolPda.toBase58(),
        pool: meta?.pool ?? null,
        asset: meta?.asset ?? asset.toBase58(),
        amount: meta?.amount ?? amount.toString(),
        deposits: rows.map((d) => ({
          commitment: d.commitment,
          slot: Number(d.slot),
        })),
      });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.get("/nullifiers/:hash", async (req, res) => {
    const hash = req.params.hash.toLowerCase().replace(/^0x/, "");
    const { rows } = await pool.query<{ c: string }>(`SELECT 1 as c FROM mixer_nullifiers WHERE nullifier_hash = $1`, [
      hash,
    ]);
    res.json({ spent: rows.length > 0 });
  });

  r.get("/pools/:asset/:amount/root", async (req, res) => {
    try {
      const asset = new PublicKey(req.params.asset);
      const amount = BigInt(req.params.amount);
      const poolPda = mixerPoolPda(mixerProgram, asset, amount);
      const { rows } = await pool.query<{ latest_root: string | null }>(
        `SELECT latest_root FROM mixer_pools WHERE mixer = $1`,
        [poolPda.toBase58()],
      );
      res.json({ root: rows[0]?.latest_root ?? null, mixer: poolPda.toBase58() });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  return r;
}
