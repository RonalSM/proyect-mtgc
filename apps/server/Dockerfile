# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for node native modules and prisma engines
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/server/prisma ./apps/server/prisma/

# Install all monorepo dependencies
RUN npm ci

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Build shared package
RUN npm run build -w @mtgc/shared

# Generate Prisma Client & compile TypeScript server
WORKDIR /app/apps/server
RUN npx prisma generate
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mtgc

# Copy built artifacts and production dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

USER mtgc

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
