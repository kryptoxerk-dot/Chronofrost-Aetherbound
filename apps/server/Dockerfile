# Chronofrost server image. Builds the server (and its prod deps) in a pnpm
# workspace, then ships a slim runtime. Works on Railway / Fly.io / Render-Docker.
#
# Build context must be the REPO ROOT:
#   docker build -f apps/server/Dockerfile -t chronofrost-server .

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @chronofrost/server build
# Produce a self-contained deploy dir (server dist + flattened prod deps).
RUN pnpm --filter @chronofrost/server deploy --prod /app/out

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/out/node_modules ./node_modules
COPY --from=build /app/out/dist ./dist
COPY --from=build /app/out/package.json ./package.json
# Migration source + runner (run once against the DB before/at first deploy).
COPY --from=build /app/resources ./resources
COPY --from=build /app/scripts ./scripts
EXPOSE 8787
# The host injects PORT; the server binds it (falls back to SERVER_PORT=8787).
CMD ["node", "dist/index.js"]
