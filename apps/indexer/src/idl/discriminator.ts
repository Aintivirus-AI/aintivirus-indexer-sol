import crypto from "node:crypto";

/** First 8 bytes of sha256(`event:${name}`) — matches anchor_lang event discriminators */
export function eventDiscriminator(name: string): number[] {
  return [...crypto.createHash("sha256").update(`event:${name}`).digest().subarray(0, 8)];
}
