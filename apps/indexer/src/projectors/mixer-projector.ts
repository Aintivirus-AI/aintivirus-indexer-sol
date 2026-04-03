import type pg from "pg";
import type { ProgramIds } from "../types/programs.js";
import type { DecodedTxEvent } from "../services/ingest.js";

function commitmentKey(hexOrBytes: unknown): string {
  if (typeof hexOrBytes === "string") return hexOrBytes.toLowerCase();
  if (Buffer.isBuffer(hexOrBytes))
    return hexOrBytes.toString("hex").toLowerCase();
  if (Array.isArray(hexOrBytes))
    return Buffer.from(hexOrBytes as number[])
      .toString("hex")
      .toLowerCase();
  return String(hexOrBytes);
}

function txTimeFromBlockTime(blockTimeSec: number | null): Date | null {
  if (blockTimeSec == null) return null;
  return new Date(blockTimeSec * 1000);
}

export async function projectMixerFromDecoded(
  client: pg.PoolClient,
  _ids: ProgramIds,
  signature: string,
  slot: number,
  blockTimeSec: number | null,
  status: string,
  decoded: DecodedTxEvent[],
): Promise<void> {
  const txTime = txTimeFromBlockTime(blockTimeSec);
  const mixerDeployed = decoded.filter(
    (d) => d.program === "factory" && d.name === "MixerDeployed",
  );
  const depositStates = decoded.filter(
    (d) => d.program === "mixer" && d.name === "DepositStateEvent",
  );
  const deposited = decoded.filter(
    (d) => d.program === "factory" && d.name === "Deposited",
  );
  const withdraws = decoded.filter(
    (d) => d.program === "mixer" && d.name === "WithdrawValidated",
  );
  const factoryWithdraws = decoded.filter(
    (d) => d.program === "factory" && d.name === "Withdrawn",
  );
  const giftCardUpdates = decoded.filter(
    (d) => d.program === "factory" && d.name === "MixerGiftCardEnabledUpdated",
  );

  for (const md of mixerDeployed) {
    const pool = String(md.data.mixerPool ?? "");
    const mixer = String(md.data.mixer ?? "");
    const asset = String(md.data.asset ?? "");
    const amount = String(md.data.amount ?? "0");
    if (!pool || !mixer) continue;
    await client.query(
      `INSERT INTO mixer_pools (pool, mixer, asset, amount, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (pool) DO UPDATE SET
         mixer = EXCLUDED.mixer,
         asset = EXCLUDED.asset,
         amount = EXCLUDED.amount,
         updated_at = NOW()`,
      [pool, mixer, asset, amount],
    );
  }

  for (const g of giftCardUpdates) {
    const pool = String(g.data.mixerPool ?? g.data.mixer_pool ?? "");
    const enabled = Boolean(g.data.enabled ?? false);
    if (!pool) continue;
    await client.query(
      `INSERT INTO mixer_pools (pool, asset, amount, gift_card_enabled, updated_at)
       VALUES ($1, 'unknown', 0, $2, NOW())
       ON CONFLICT (pool) DO UPDATE SET
         gift_card_enabled = EXCLUDED.gift_card_enabled,
         updated_at = NOW()`,
      [pool, enabled],
    );
  }

  for (const ds of depositStates) {
    const comm = commitmentKey(ds.data.commitment);
    const dep = deposited.find(
      (x) => commitmentKey(x.data.commitment) === comm,
    );
    const mixerStr = String(ds.data.mixer ?? "");

    if (!dep) {
      continue;
    }

    const asset = String(dep.data.asset ?? "");
    const amount = String(dep.data.amount ?? "0");
    const user = String(dep.data.user ?? "");
    const protocolFee = String(dep.data.fee ?? "0");
    const partnerFee = String(dep.data.partnerFee ?? "0");

    await client.query(
      `INSERT INTO mixer_deposits (
        pool, asset, amount, commitment, signature, slot,
        outer_instruction_index, inner_instruction_index, depositor, tx_type, status,
        protocol_fee, partner_fee, tx_time
      ) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (pool, commitment) DO UPDATE SET
        tx_time = COALESCE(mixer_deposits.tx_time, EXCLUDED.tx_time)`,
      [
        mixerStr,
        asset,
        amount,
        comm,
        signature,
        slot,
        ds.logIndex,
        user,
        "deposit",
        status,
        protocolFee,
        partnerFee,
        txTime,
      ],
    );

    await client.query(
      `UPDATE mixer_pools
       SET asset = $2,
           amount = $3,
           updated_at = NOW()
       WHERE mixer = $1`,
      [mixerStr, asset, amount],
    );
  }

  for (const w of withdraws) {
    const nh = commitmentKey(w.data.nullifierHash);
    const pool = String(w.data.mixer ?? "");
    await client.query(
      `INSERT INTO mixer_nullifiers (nullifier_hash, pool, signature, slot, outer_instruction_index, inner_instruction_index, status)
       VALUES ($1,$2,$3,$4,0,$5,$6)
       ON CONFLICT (nullifier_hash) DO NOTHING`,
      [nh, pool, signature, slot, w.logIndex, status],
    );
  }

  for (const w of factoryWithdraws) {
    const nh = commitmentKey(w.data.nullifierHash);
    const mixer = String(w.data.mixer ?? "");
    const asset = String(w.data.asset ?? "");
    const amount = String(w.data.amount ?? "0");
    const recipient = String(w.data.recipient ?? "");
    const fee = String(w.data.fee ?? "0");
    const relayer = String(w.data.relayer ?? "");
    await client.query(
      `INSERT INTO mixer_withdrawals (
        mixer, asset, amount, recipient, nullifier_hash, fee, relayer,
        signature, slot, outer_instruction_index, inner_instruction_index, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11)
      ON CONFLICT (nullifier_hash) DO NOTHING`,
      [
        mixer,
        asset,
        amount,
        recipient,
        nh,
        fee,
        relayer,
        signature,
        slot,
        w.logIndex,
        status,
      ],
    );

    await client.query(
      `INSERT INTO mixer_nullifiers (nullifier_hash, pool, signature, slot, outer_instruction_index, inner_instruction_index, status)
       VALUES ($1,$2,$3,$4,0,$5,$6)
       ON CONFLICT (nullifier_hash) DO NOTHING`,
      [nh, mixer, signature, slot, w.logIndex, status],
    );
  }
}
