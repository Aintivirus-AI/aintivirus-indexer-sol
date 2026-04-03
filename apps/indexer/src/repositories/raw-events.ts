import type pg from "pg";

export async function insertRawEvent(
  client: pg.PoolClient,
  row: {
    programId: string;
    signature: string;
    slot: number;
    blockTime: number | null;
    txIndex: number | null;
    outerInstructionIndex: number;
    innerInstructionIndex: number;
    eventType: string;
    payloadJson: object;
    status: string;
    parserVersion?: string;
  },
): Promise<boolean> {
  const r = await client.query(
    `INSERT INTO raw_events (
      program_id, signature, slot, block_time, tx_index,
      outer_instruction_index, inner_instruction_index,
      event_type, payload_json, status, parser_version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
    ON CONFLICT (signature, outer_instruction_index, inner_instruction_index, event_type) DO NOTHING
    RETURNING id`,
    [
      row.programId,
      row.signature,
      row.slot,
      row.blockTime,
      row.txIndex,
      row.outerInstructionIndex,
      row.innerInstructionIndex,
      row.eventType,
      JSON.stringify(row.payloadJson),
      row.status,
      row.parserVersion ?? "1",
    ],
  );
  return (r.rowCount ?? 0) > 0;
}
