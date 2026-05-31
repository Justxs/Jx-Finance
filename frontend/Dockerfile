FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
