import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../shared/prisma.service";

function parseLimit(input?: string): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(500, Math.floor(n));
}

function parseOffset(input?: string): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

@Injectable()
export class MixerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDeployedMixers(limitRaw?: string, offsetRaw?: string) {
    const limit = parseLimit(limitRaw);
    const offset = parseOffset(offsetRaw);
    const rows = await this.prisma.mixerPool.findMany({
      select: {
        pool: true,
        mixer: true,
        asset: true,
        amount: true,
        giftCardEnabled: true,
        latestRoot: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    });

    const items = rows.map((row) => ({
      pool: row.pool,
      mixer: row.mixer,
      asset: row.asset,
      amount: row.amount.toString(),
      gift_card_enabled: row.giftCardEnabled,
      latest_root: row.latestRoot,
      updated_at: row.updatedAt,
    }));
    return { limit, offset, items };
  }

  async getDepositsByMixer(
    mixer: string,
    limitRaw?: string,
    offsetRaw?: string,
  ) {
    const limit = parseLimit(limitRaw);
    const offset = parseOffset(offsetRaw);
    const rows = await this.prisma.mixerDeposit.findMany({
      select: {
        pool: true,
        asset: true,
        amount: true,
        commitment: true,
        signature: true,
        slot: true,
        depositor: true,
        protocolFee: true,
        partnerFee: true,
        status: true,
        txTime: true,
        createdAt: true,
      },
      where: { pool: mixer },
      orderBy: [{ txTime: { sort: "asc", nulls: "last" } }],
      skip: offset,
      take: limit,
    });

    const items = rows.map((row) => ({
      pool: row.pool,
      asset: row.asset,
      amount: row.amount.toString(),
      commitment: row.commitment,
      signature: row.signature,
      slot: row.slot.toString(),
      depositor: row.depositor,
      protocol_fee: row.protocolFee?.toString() ?? null,
      partner_fee: row.partnerFee?.toString() ?? null,
      status: row.status,
      tx_time: row.txTime,
      created_at: row.createdAt,
    }));
    return { mixer, limit, offset, items };
  }

  /**
   * Count deposits for one pool. With `sinceMs`, uses on-chain tx time (`tx_time`) when set,
   * else `created_at`. Omit `sinceMs` for all time.
   */
  async tallyDeposits(poolAddress: string, opts?: { sinceMs?: number }) {
    const since =
      opts?.sinceMs !== undefined ? new Date(opts.sinceMs) : undefined;
    const countInRange = await this.prisma.mixerDeposit.count({
      where: {
        pool: poolAddress,
        ...(since !== undefined
          ? {
              OR: [
                { txTime: { gte: since } },
                { AND: [{ txTime: null }, { createdAt: { gte: since } }] },
              ],
            }
          : {}),
      },
    });
    return { countInRange };
  }

  async getAllWithdrawals(limitRaw?: string, offsetRaw?: string) {
    const limit = parseLimit(limitRaw);
    const offset = parseOffset(offsetRaw);
    const rows = await this.prisma.mixerWithdrawal.findMany({
      select: {
        mixer: true,
        asset: true,
        amount: true,
        recipient: true,
        nullifierHash: true,
        fee: true,
        relayer: true,
        signature: true,
        slot: true,
        status: true,
        createdAt: true,
      },
      orderBy: { slot: "desc" },
      skip: offset,
      take: limit,
    });

    const items = rows.map((row) => ({
      mixer: row.mixer,
      asset: row.asset,
      amount: row.amount.toString(),
      recipient: row.recipient,
      nullifier_hash: row.nullifierHash,
      fee: row.fee.toString(),
      relayer: row.relayer,
      signature: row.signature,
      slot: row.slot.toString(),
      status: row.status,
      created_at: row.createdAt,
    }));
    return { limit, offset, items };
  }
}
