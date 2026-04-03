# Aintivirus Solana indexer

Indexer and APIs for the **Aintivirus Mixer** program on Solana (factory, mixer, staking, and payment programs). The stack ingests on-chain transactions into PostgreSQL, projects mixer and staking state, and exposes HTTP endpoints for deposits, nullifiers, merkle roots, and admin tasks.

## Repository

**https://github.com/Aintivirus-AI/aintivirus-indexer-sol**

## Monorepo layout

| Package | Path | Role |
|--------|------|------|
| `@aintivirus/indexer` | `apps/indexer` | RPC ingestion, SQL migrations, Express API, background workers |
| `@aintivirus/query-service` | `apps/query-service` | NestJS read service using Prisma against the same database |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+ (Dockerfile uses 22)
- [pnpm](https://pnpm.io/) 9 (`package.json` pins `pnpm@9.15.0` via Corepack)
- PostgreSQL reachable via `DATABASE_URL`
- A Solana JSON-RPC endpoint (`SOLANA_RPC_URL`)

## Quick start

From the repository root:

```bash
corepack enable
pnpm install
```

### Indexer

1. Copy environment template and edit values:

   ```bash
   cp apps/indexer/.env.example apps/indexer/.env
   ```

2. Run migrations (from `apps/indexer` or via CLI — see below).

3. Start the API and workers in development:

   ```bash
   cd apps/indexer
   pnpm migrate
   pnpm dev:servers
   ```

   Or run pieces separately: `pnpm dev` (API), `pnpm dev:backfill`, `pnpm dev:live`, `pnpm dev:reconciler`.

Root-level shortcuts:

```bash
pnpm dev      # indexer API only (tsx watch)
pnpm build    # all packages
pnpm test     # indexer tests
pnpm lint     # all packages
```

### Query service

Uses the same `DATABASE_URL` as the indexer (see `apps/query-service/.env.example`).

```bash
cp apps/query-service/.env.example apps/query-service/.env
cd apps/query-service
pnpm prisma:generate
pnpm dev
```

## Environment (indexer)

Defined in `apps/indexer/src/config/env.ts`. Minimal example lives in `apps/indexer/.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SOLANA_RPC_URL` | Yes | Solana RPC URL (e.g. devnet/mainnet) |
| `PROGRAM_IDS` | No | Comma-separated: `factory,mixer,staking,payment`. Defaults to devnet IDs in code if omitted |
| `PORT` | No | API port (default `8080`) |
| `OVERLAP_SLOTS` | No | Slot overlap for workers (default `100`) |
| `BACKFILL_BATCH_SIZE` | No | Backfill batch size (default `50`) |
| `ADMIN_API_KEY` | No | Protects admin HTTP routes when set |
| `LOG_LEVEL` | No | `fatal` … `trace` (default `info`) |

## CLI (`apps/indexer`)

```bash
cd apps/indexer
pnpm cli --help
```

Useful commands include `migrate`, `rebuild:mixer` / `rebuild:staking` (rebuild derived tables from `raw_events`), and `checkpoints` (indexer progress).

## Docker (indexer API only)

Build from the repo root:

```bash
docker build -f apps/indexer/Dockerfile .
```

The image runs `node apps/indexer/dist/server.js` and exposes port `8080`. Run migrations and workers according to your deployment layout (the default `CMD` is API-only; use `WORKER_MODE` with `worker-entry` for backfill/live/reconciler in separate processes).
