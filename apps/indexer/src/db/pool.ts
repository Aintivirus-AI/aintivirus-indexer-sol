import pg from "pg";

export function createPool(connectionString: string) {
  return new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
  });
}

export type DbPool = ReturnType<typeof createPool>;
