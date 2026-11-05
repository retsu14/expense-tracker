FROM node:24.14.0-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies in a separate layer so package changes control caching.
FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

# Development image used by the root docker-compose.yml file.
FROM base AS development

ENV NODE_ENV=development

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--webpack", "--hostname", "0.0.0.0"]

# Build a production-ready Next.js standalone server.
FROM base AS builder

ENV NODE_ENV=production

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS production

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
