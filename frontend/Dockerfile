FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts @nubjs/nub@0.9.2
WORKDIR /app

COPY frontend/package.json frontend/nub.lock frontend/nub.jsonc ./
RUN nub ci

COPY frontend/ ./
RUN nub run build

FROM caddy:2.11.4-alpine@sha256:de23def33b17fb5d1290b0f6c2add1d70780e52341896c00a4c8a2a2fe9d355e
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/Caddyfile.production /etc/caddy/Caddyfile.production
