import { Connection } from "@solana/web3.js";
import express from "express";
import { getProgramIds, loadEnv } from "./config/env.js";
import { createPool } from "./db/pool.js";
import { adminRouter } from "./api/admin-routes.js";
import { mixerRouter } from "./api/mixer-routes.js";
import { stakingRouter } from "./api/staking-routes.js";
import { createLogger } from "./utils/logger.js";

const env = loadEnv();
const log = createLogger(env);
const pool = createPool(env.DATABASE_URL);
const ids = getProgramIds(env);
const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");

const app = express();
app.use(express.json());
app.use("/mixer", mixerRouter(pool, ids));
app.use("/staking", stakingRouter(pool));
app.use("/admin", adminRouter(pool, ids, env, connection, log));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(env.PORT, () => {
  log.info({ port: env.PORT }, "api listening");
});
