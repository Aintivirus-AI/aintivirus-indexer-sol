import { PublicKey } from "@solana/web3.js";

/** Mixer PDA seeds: ["mixer", asset, amount.to_le_bytes()] */
export function mixerPoolPda(mixerProgramId: PublicKey, asset: PublicKey, amount: bigint): PublicKey {
  const amountBuf = Buffer.allocUnsafe(8);
  amountBuf.writeBigUInt64LE(amount);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mixer"), asset.toBuffer(), amountBuf],
    mixerProgramId,
  );
  return pda;
}

export function bytesToHex(buf: Uint8Array | number[]): string {
  return Buffer.from(buf).toString("hex");
}

export function pubkeyToString(pk: unknown): string {
  if (pk instanceof PublicKey) return pk.toBase58();
  if (typeof pk === "string") return pk;
  if (
    pk &&
    typeof pk === "object" &&
    "toBase58" in pk &&
    typeof (pk as PublicKey).toBase58 === "function"
  ) {
    return (pk as PublicKey).toBase58();
  }
  return String(pk);
}
