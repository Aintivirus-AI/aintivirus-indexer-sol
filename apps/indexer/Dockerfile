# Build from repository root:
#   docker build -f apps/indexer/Dockerfile .
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/indexer/package.json ./apps/indexer/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/indexer ./apps/indexer
RUN pnpm --filter @aintivirus/indexer build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo/apps/indexer
COPY --from=build /repo/apps/indexer/dist ./dist
COPY --from=build /repo/apps/indexer/package.json ./
COPY --from=deps /repo/node_modules /repo/node_modules
WORKDIR /repo
EXPOSE 8080
CMD ["node", "apps/indexer/dist/server.js"]
