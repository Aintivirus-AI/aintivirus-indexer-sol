import { BorshEventCoder } from "@coral-xyz/anchor";
import type { ProgramIds } from "../types/programs.js";
import { factoryIdl, mixerIdl, stakingIdl } from "../idl/idl-defs.js";

export type DecodedEvent = {
  program: keyof ProgramIds;
  name: string;
  data: Record<string, unknown>;
};

function makeDecoders(ids: ProgramIds) {
  const mix = new BorshEventCoder(mixerIdl(ids.mixer));
  const fac = new BorshEventCoder(factoryIdl(ids.factory));
  const stk = new BorshEventCoder(stakingIdl(ids.staking));
  return [
    { program: "mixer" as const, coder: mix },
    { program: "factory" as const, coder: fac },
    { program: "staking" as const, coder: stk },
  ];
}

/** `log` is the base64 payload only (no "Program data: " prefix) */
export function decodeProgramDataBase64(
  ids: ProgramIds,
  base64Payload: string,
): DecodedEvent | null {
  const decoders = makeDecoders(ids);
  for (const { program, coder } of decoders) {
    try {
      const decoded = coder.decode(base64Payload);
      if (decoded) {
        return { program, name: decoded.name, data: decoded.data as Record<string, unknown> };
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Extract `Program data: <b64>` from Solana log lines */
export function extractProgramDataPayloads(logs: string[] | null | undefined): string[] {
  if (!logs) return [];
  const prefix = "Program data: ";
  const out: string[] = [];
  for (const line of logs) {
    if (line.startsWith(prefix)) {
      out.push(line.slice(prefix.length));
    }
  }
  return out;
}
