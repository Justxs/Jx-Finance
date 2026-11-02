FROM node:24.22.2-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts vite-plus@1.4.0
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile

COPY frontend/ ./
RUN vp run build

FROM caddy:2.11.7-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5
LABEL org.opencontainers.image.title="Jx Finance web" \
      org.opencontainers.image.description="A private household ledger you run yourself: the web app, served by Caddy." \
      org.opencontainers.image.source="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.url="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.licenses="MIT"
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/Caddyfile.production /etc/caddy/Caddyfile.production
