FROM node:20.11.1-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package definitions
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json


# Install dependencies
RUN pnpm install --frozen-lockfile

FROM deps AS dev
WORKDIR /app
# We rely on volume mounts for source code in dev
CMD ["pnpm", "--filter", "frontend", "dev"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app .

# Copy source code
COPY apps/web ./apps/web
COPY packages/api-client ./packages/api-client

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build
RUN cd apps/web && pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
# Next.js standalone output tracing handles node_modules
# We need to copy from apps/web/.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# ENV PORT 3000 (Render will set this)
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# The root server.js is the entry point in standalone mode for monorepos
CMD ["node", "apps/web/server.js"]
