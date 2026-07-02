FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.12.0

WORKDIR /app

# Copy workspace config
COPY package.json turbo.json pnpm-workspace.yaml* ./
COPY packages/ ./packages/

# Copy worker
COPY apps/worker/ ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @agent-os/worker...

# Build packages
RUN pnpm build --filter @agent-os/core
RUN pnpm build --filter @agent-os/memory
RUN pnpm build --filter @agent-os/tools

# Production stage
FROM node:22-alpine AS production

RUN npm install -g pnpm@9.12.0

WORKDIR /app

COPY --from=base /app ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "--experimental-strip-types", "apps/worker/src/index.ts"]
