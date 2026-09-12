FROM node:22-alpine AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global @nubjs/nub@0.8.3
WORKDIR /app

COPY frontend/package.json frontend/nub.lock frontend/nub.jsonc ./
RUN nub ci

COPY frontend/ ./
RUN nub run build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
