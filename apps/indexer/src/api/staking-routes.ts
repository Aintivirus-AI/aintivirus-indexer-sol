import { Router } from "express";
import type pg from "pg";

export function stakingRouter(pool: pg.Pool): Router {
  const r = Router();

  r.get("/seasons/current", async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM staking_seasons ORDER BY season_id DESC LIMIT 1`,
    );
    res.json(rows[0] ?? null);
  });

  r.get("/seasons/:id", async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM staking_seasons WHERE season_id = $1`, [req.params.id]);
    res.json(rows[0] ?? null);
  });

  r.get("/users/:wallet/positions", async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM staking_positions WHERE user_wallet = $1`, [
      req.params.wallet,
    ]);
    res.json({ positions: rows });
  });

  r.get("/users/:wallet/rewards", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT season_id, asset, reward_debt FROM staking_positions WHERE user_wallet = $1`,
      [req.params.wallet],
    );
    res.json({ rewards: rows });
  });

  r.get("/assets/:asset/stats", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT season_id, SUM(staked_amount::numeric) as total_staked FROM staking_positions WHERE asset = $1 GROUP BY season_id`,
      [req.params.asset],
    );
    res.json({ stats: rows });
  });

  return r;
}
