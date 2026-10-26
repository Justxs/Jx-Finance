FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts vite-plus@1.4.0
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile

COPY frontend/ ./
RUN vp run build

FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f
LABEL org.opencontainers.image.title="Jx Finance web" \
      org.opencontainers.image.description="A private household ledger you run yourself: the web app, served by Caddy." \
      org.opencontainers.image.source="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.url="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.licenses="MIT"
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/Caddyfile.production /etc/caddy/Caddyfile.production
