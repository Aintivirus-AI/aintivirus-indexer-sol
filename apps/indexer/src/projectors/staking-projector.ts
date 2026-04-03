import type pg from "pg";
import type { ProgramIds } from "../types/programs.js";
import type { DecodedTxEvent } from "../services/ingest.js";

export async function projectStakingFromDecoded(
  client: pg.PoolClient,
  ids: ProgramIds,
  signature: string,
  slot: number,
  status: string,
  decoded: DecodedTxEvent[],
): Promise<void> {
  for (const d of decoded) {
    if (d.program !== "staking" && d.program !== "factory") continue;
    if (d.program === "factory" && !["Staked", "Claimed", "Unstaked"].includes(d.name)) continue;
    const programId = d.program === "staking" ? ids.staking : ids.factory;
    const typePrefix = d.program === "staking" ? "staking" : "factory";
    await client.query(
      `INSERT INTO staking_events (
        program_id, signature, slot, outer_instruction_index, inner_instruction_index,
        user_wallet, asset, season_id, event_type, payload_json, status
      ) VALUES ($1,$2,$3,0,$4,$5,$6,$7,$8,$9::jsonb,$10)
      ON CONFLICT (signature, outer_instruction_index, inner_instruction_index, event_type) DO NOTHING`,
      [
        programId,
        signature,
        slot,
        d.logIndex,
        extractWallet(d),
        extractAsset(d),
        extractSeason(d),
        `${typePrefix}.${d.name}`,
        JSON.stringify(d.data),
        status,
      ],
    );
  }

  for (const d of decoded) {
    if (d.program !== "staking") continue;
    if (d.name === "StakedState") {
      const wallet = String(d.data.staker ?? "");
      const asset = String(d.data.asset ?? "");
      const seasonId = BigInt(String(d.data.seasonId ?? "0"));
      const amount = String(d.data.amount ?? "0");
      await client.query(
        `INSERT INTO staking_positions (user_wallet, asset, season_id, staked_amount, reward_debt, updated_at)
         VALUES ($1,$2,$3,$4,0,NOW())
         ON CONFLICT (user_wallet, asset, season_id) DO UPDATE SET
           staked_amount = EXCLUDED.staked_amount,
           updated_at = NOW()`,
        [wallet, asset, seasonId.toString(), amount],
      );
    }
    if (d.name === "UnstakedState") {
      const wallet = String(d.data.staker ?? "");
      const asset = String(d.data.asset ?? "");
      const { rows } = await client.query<{ season_id: string }>(
        `SELECT season_id FROM staking_positions WHERE user_wallet = $1 AND asset = $2 ORDER BY updated_at DESC LIMIT 1`,
        [wallet, asset],
      );
      const seasonId = rows[0]?.season_id;
      if (seasonId) {
        await client.query(
          `UPDATE staking_positions SET staked_amount = 0, updated_at = NOW()
           WHERE user_wallet = $1 AND asset = $2 AND season_id = $3`,
          [wallet, asset, seasonId],
        );
      }
    }
    if (d.name === "ClaimedState") {
      const wallet = String(d.data.staker ?? "");
      const asset = String(d.data.asset ?? "");
      const seasonId = BigInt(String(d.data.seasonId ?? "0"));
      const reward = String(d.data.rewardAmount ?? "0");
      await client.query(
        `UPDATE staking_positions SET reward_debt = reward_debt + $4::numeric, updated_at = NOW()
         WHERE user_wallet = $1 AND asset = $2 AND season_id = $3`,
        [wallet, asset, seasonId.toString(), reward],
      );
    }
    if (d.name === "NextSeasonStarted") {
      const seasonId = BigInt(String(d.data.seasonId ?? "0"));
      const start = BigInt(String(d.data.startTimestamp ?? "0"));
      const end = BigInt(String(d.data.endTimestamp ?? "0"));
      await client.query(
        `INSERT INTO staking_seasons (season_id, start_time, end_time, status, total_staked, updated_at)
         VALUES ($1,$2,$3,'active',0,NOW())
         ON CONFLICT (season_id) DO UPDATE SET
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           updated_at = NOW()`,
        [seasonId.toString(), start.toString(), end.toString()],
      );
    }
    if (d.name === "RewardsAdded") {
      const asset = String(d.data.asset ?? "");
      const amount = String(d.data.amount ?? "0");
      const seasonId = BigInt(String(d.data.seasonId ?? d.data.season_id ?? "0"));
      await client.query(
        `INSERT INTO staking_rewards_added (
          signature, slot, outer_instruction_index, inner_instruction_index,
          asset, amount, season_id, status
        ) VALUES ($1,$2,0,$3,$4,$5,$6,$7)
        ON CONFLICT (signature, outer_instruction_index, inner_instruction_index) DO NOTHING`,
        [signature, slot, d.logIndex, asset, amount, seasonId.toString(), status],
      );
    }
  }
}

function extractWallet(d: DecodedTxEvent): string | null {
  const x = d.data.staker ?? d.data.user;
  return x ? String(x) : null;
}

function extractAsset(d: DecodedTxEvent): string | null {
  const x = d.data.asset;
  return x ? String(x) : null;
}

function extractSeason(d: DecodedTxEvent): string | null {
  const x = d.data.seasonId ?? d.data.season_id;
  return x !== undefined && x !== null ? String(x) : null;
}
