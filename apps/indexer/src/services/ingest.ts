import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import type pg from "pg";
import type { ProgramIds } from "../types/programs.js";
import {
  decodeProgramDataBase64,
  extractProgramDataPayloads,
} from "../parsers/event-decode.js";
import { insertRawEvent } from "../repositories/raw-events.js";
import { jsonSafePayload } from "./serialize-payload.js";
import { projectMixerFromDecoded } from "../projectors/mixer-projector.js";
import { projectStakingFromDecoded } from "../projectors/staking-projector.js";

export type DecodedTxEvent = {
  program: keyof ProgramIds;
  programId: string;
  name: string;
  data: Record<string, unknown>;
  logIndex: number;
};

function programIdFor(ids: ProgramIds, p: keyof ProgramIds): string {
  return ids[p];
}

export async function ingestParsedTransaction(
  pool: pg.Pool,
  ids: ProgramIds,
  tx: ParsedTransactionWithMeta,
  sig: string,
  status: "processed" | "confirmed" | "finalized",
): Promise<void> {
  const slot = tx.slot;
  const blockTime = tx.blockTime ?? null;
  const meta = tx.meta;
  const logs = meta?.logMessages ?? [];
  const payloads = extractProgramDataPayloads(logs);

  const decoded: DecodedTxEvent[] = [];
  let logIndex = 0;
  for (const b64 of payloads) {
    const ev = decodeProgramDataBase64(ids, b64);
    if (ev) {
      decoded.push({
        program: ev.program,
        programId: programIdFor(ids, ev.program),
        name: ev.name,
        data: jsonSafePayload(ev.data),
        logIndex: logIndex++,
      });
    }
  }

  if (decoded.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const d of decoded) {
      const eventType = `${d.program}.${d.name}`;
      await insertRawEvent(client, {
        programId: d.programId,
        signature: sig,
        slot,
        blockTime,
        txIndex: null,
        outerInstructionIndex: 0,
        innerInstructionIndex: d.logIndex,
        eventType,
        payloadJson: { ...d.data, _anchorEvent: d.name },
        status,
      });
    }
    await projectMixerFromDecoded(
      client,
      ids,
      sig,
      slot,
      blockTime,
      status,
      decoded,
    );
    await projectStakingFromDecoded(client, ids, sig, slot, status, decoded);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
