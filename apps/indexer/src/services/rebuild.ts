import type pg from "pg";
import type { ProgramIds } from "../types/programs.js";
import type { DecodedTxEvent } from "./ingest.js";
import { projectMixerFromDecoded } from "../projectors/mixer-projector.js";
import { projectStakingFromDecoded } from "../projectors/staking-projector.js";

function parseEventType(eventType: string): { program: keyof ProgramIds; name: string } | null {
  const i = eventType.indexOf(".");
  if (i <= 0) return null;
  const ns = eventType.slice(0, i);
  const name = eventType.slice(i + 1);
  if (ns === "mixer" || ns === "factory" || ns === "staking" || ns === "payment") {
    return { program: ns, name };
  }
  return null;
}

/** Rebuild derived tables from raw_events (same signature batches). */
export async function rebuildDerivedFromRaw(pool: pg.Pool, ids: ProgramIds): Promise<void> {
  const { rows } = await pool.query<{
    signature: string;
    slot: string;
    block_time: string | null;
    event_type: string;
    payload_json: Record<string, unknown>;
    outer_instruction_index: number;
    inner_instruction_index: number;
    status: string;
  }>(`SELECT signature, slot, block_time, event_type, payload_json, outer_instruction_index, inner_instruction_index, status
       FROM raw_events ORDER BY slot ASC, signature ASC, inner_instruction_index ASC`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE mixer_deposits, mixer_withdrawals, mixer_nullifiers, mixer_roots, mixer_pools RESTART IDENTITY CASCADE",
    );
    await client.query(
      "TRUNCATE staking_events, staking_rewards_added, staking_positions, staking_seasons RESTART IDENTITY CASCADE",
    );

    let currentSig = "";
    let batch: DecodedTxEvent[] = [];
    let slot = 0;
    let blockTimeSec: number | null = null;
    let status = "finalized";

    const flush = async () => {
      if (batch.length === 0) return;
      await projectMixerFromDecoded(client, ids, currentSig, slot, blockTimeSec, status, batch);
      await projectStakingFromDecoded(client, ids, currentSig, slot, status, batch);
      batch = [];
    };

    for (const row of rows) {
      const parsed = parseEventType(row.event_type);
      if (!parsed) continue;
      if (row.signature !== currentSig) {
        await flush();
        currentSig = row.signature;
        slot = Number(row.slot);
        blockTimeSec = row.block_time != null ? Number(row.block_time) : null;
        status = row.status;
      }
      const payload = { ...row.payload_json };
      delete payload._anchorEvent;
      const pid = ids[parsed.program];
      batch.push({
        program: parsed.program,
        programId: pid,
        name: parsed.name,
        data: payload,
        logIndex: row.inner_instruction_index,
      });
    }
    await flush();
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
