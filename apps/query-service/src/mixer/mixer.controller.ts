import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
} from "@nestjs/common";
import { MixerService } from "./mixer.service";

/** Undefined = all time; invalid non-empty string throws. */
function parseSinceMsOptional(raw?: string): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new BadRequestException("since_ms must be a number");
  }
  return Math.floor(n);
}

@Controller("mixer")
export class MixerController {
  constructor(
    @Inject(MixerService) private readonly mixerService: MixerService,
  ) {}

  @Get("deployed")
  async deployed(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mixerService.getDeployedMixers(limit, offset);
  }

  /**
   * Deposit count for one pool (path). Optional `since_ms` — omit for all time.
   */
  @Get(":pool/deposits/count")
  async depositCountByPool(
    @Param("pool") pool: string,
    @Query("since_ms") sinceMsRaw?: string,
  ) {
    const sinceMs = parseSinceMsOptional(sinceMsRaw);
    const { countInRange } = await this.mixerService.tallyDeposits(
      pool,
      sinceMs !== undefined ? { sinceMs } : undefined,
    );
    return {
      pool,
      ...(sinceMs !== undefined ? { since_ms: sinceMs } : {}),
      count: countInRange,
    };
  }

  @Get(":mixer/deposits")
  async depositsByMixer(
    @Param("mixer") mixer: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mixerService.getDepositsByMixer(mixer, limit, offset);
  }

  @Get("withdrawals")
  async allWithdrawals(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mixerService.getAllWithdrawals(limit, offset);
  }
}
