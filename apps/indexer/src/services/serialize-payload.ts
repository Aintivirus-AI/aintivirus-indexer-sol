import { PublicKey } from "@solana/web3.js";

/** JSON-safe payload (PublicKey -> base58, Uint8Array -> hex) */
export function jsonSafePayload(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof PublicKey) {
      out[k] = v.toBase58();
    } else if (v instanceof Uint8Array) {
      out[k] = Buffer.from(v).toString("hex");
    } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === "number") {
      out[k] = Buffer.from(v as number[]).toString("hex");
    } else if (v && typeof v === "object" && "toBase58" in (v as object)) {
      out[k] = (v as PublicKey).toBase58();
    } else {
      out[k] = v as unknown;
    }
  }
  return out;
}
