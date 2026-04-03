import pg from "pg";
import { loadEnv } from "../config/env.js";

async function main() {
  const env = loadEnv();
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE
        raw_events,
        mixer_deposits,
        mixer_withdrawals,
        mixer_nullifiers,
        mixer_roots,
        mixer_pools,
        staking_events,
        staking_rewards_added,
        staking_positions,
        staking_seasons,
        indexer_checkpoints
       RESTART IDENTITY CASCADE`,
    );
    await client.query("COMMIT");
    console.log("Database data reset complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
