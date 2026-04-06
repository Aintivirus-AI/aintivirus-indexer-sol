import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  /** Comma-separated program IDs (factory, mixer, staking, payment) */
  PROGRAM_IDS: z.string().optional(),
  OVERLAP_SLOTS: z.coerce.number().default(100),
  BACKFILL_BATCH_SIZE: z.coerce.number().default(50),
  ADMIN_API_KEY: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment");
  }
  return parsed.data;
}

/** Default devnet program IDs from Anchor.toml — override via PROGRAM_IDS */
export const DEFAULT_PROGRAM_IDS = {
  factory: "kVt5uNJU4WtC9CxzbkjMu2yXRp8XnRQmJhQJFhEM1xZ",
  mixer: "7ohbm4D6VYaRzAXezwSdxUydBz7Q1wHwCTQfkhNK3rJu",
  payment: "9AXguqktj6N7tsrSDSbg9yyt71wj9s1G7r4euYEmSCts",
  staking: "B2eBxcaiSyXF4TC7w33e7Kmwr5ZPkhF7KWmKQXACWUQC",
} as const;

export function getProgramIds(env: Env) {
  if (env.PROGRAM_IDS) {
    const parts = env.PROGRAM_IDS.split(",").map((s) => s.trim());
    if (parts.length !== 4) {
      throw new Error(
        "PROGRAM_IDS must list 4 pubkeys: factory,mixer,staking,payment",
      );
    }
    return {
      factory: parts[0]!,
      mixer: parts[1]!,
      staking: parts[2]!,
      payment: parts[3]!,
    };
  }
  return { ...DEFAULT_PROGRAM_IDS };
}
