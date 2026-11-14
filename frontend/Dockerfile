FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts vite-plus@1.6.0
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
