FROM node:24-alpine AS build
RUN apk add --no-cache libgcc libstdc++ && npm install --global --ignore-scripts @nubjs/nub@0.9.2
WORKDIR /app

COPY frontend/package.json frontend/nub.lock frontend/nub.jsonc ./
RUN nub ci

COPY frontend/ ./
RUN nub run build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
COPY frontend/Caddyfile /etc/caddy/Caddyfile
