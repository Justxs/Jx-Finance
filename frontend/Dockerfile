FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts @nubjs/nub@0.9.6
WORKDIR /app

COPY frontend/package.json frontend/nub.lock frontend/nub.jsonc ./
RUN nub ci

COPY frontend/ ./
RUN nub run build

FROM caddy:2.11.6-alpine@sha256:c776e0c6413b544d0459665e54ec7b8b2a15000c0cbee8b254da0067b1d184ff
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/Caddyfile.production /etc/caddy/Caddyfile.production
