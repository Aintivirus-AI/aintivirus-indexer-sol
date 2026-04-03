import pino from "pino";
import type { Env } from "../config/env.js";

export function createLogger(env: Pick<Env, "NODE_ENV" | "LOG_LEVEL">) {
  return pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: { colorize: true },
          }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
