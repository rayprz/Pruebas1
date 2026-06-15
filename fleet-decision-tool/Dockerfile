# syntax=docker/dockerfile:1
# Multi-stage build for the Fleet Decision Tool (Next.js standalone + Prisma).
# The `runner` target is the small app image; the `builder` target is reused by
# the docker-compose `migrate` service (it carries the Prisma CLI + seed).

# --- deps: install dependencies (incl. dev, needed to build) ----------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate` (needs the schema, copied above).
RUN npm ci

# --- builder: compile the Next standalone server ----------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: minimal runtime image (app only) -------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r nodejs && useradd -r -g nodejs nextjs
# The standalone bundle already contains server.js + the traced node_modules
# (including the Prisma client and the debian query engine).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
