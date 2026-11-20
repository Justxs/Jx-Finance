FROM node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts vite-plus@1.7.0
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile

COPY frontend/ ./
RUN vp run build

FROM caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
LABEL org.opencontainers.image.title="Jx Finance web" \
      org.opencontainers.image.description="A private household ledger you run yourself: the web app, served by Caddy." \
      org.opencontainers.image.source="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.url="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.licenses="MIT"
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/Caddyfile.production /etc/caddy/Caddyfile.production
