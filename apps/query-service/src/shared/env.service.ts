import dotenv from "dotenv";
import { Injectable } from "@nestjs/common";
import { z } from "zod";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(8090),
  CORS_ORIGIN: z.string().default("*"),
});

type Env = z.infer<typeof schema>;

@Injectable()
export class EnvService {
  private readonly env: Env;

  constructor() {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${parsed.error.message}`);
    }
    this.env = parsed.data;
  }

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  getNumber(key: keyof Env, fallback: number): number {
    const value = this.env[key];
    return typeof value === "number" ? value : fallback;
  }
}
