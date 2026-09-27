# Deployment: decisions

Related: architecture [Containers and the recovery command](../architecture/deployment.md).

## Current

Gitea Actions configuration already exists, including client drift; no platform-selection question remains

## Left to the operator

Deployment choices still belong to the operator: host/private address, hostname/certificate trust and production credentials. Email is now one of them: the application carries the machinery, but the SMTP server, the sender address and `App:SiteUrl` are the operator's to fill in, and nothing in the product stops working while they are empty. Advanced features still require a later scoped change, not an implied promise in this release.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-19.** Signing key, Data Protection keys and backups stay unencrypted on their volumes; the risk and the operator's mitigations (host disk encryption, volume permissions, download-and-delete for backups) are documented in Quality requirements
  - Rejected: Encrypting them in the application with a key from `.env` or a passphrase
  - Why: A key stored on the same host protects against nothing that disk encryption does not, and a passphrase typed at start breaks unattended restarts; where a real key lives is the operator's key-management decision, not something the application should invent
- **2026-09-19.** Base images pinned as patch tag plus digest, refreshed by `scripts/update-images.mjs` inside the weekly update pull request
  - Rejected: Floating tags (`postgres:16`, `caddy:2-alpine`); digest only without a tag; a bot such as Renovate
  - Why: A floating tag makes builds differ between hosts and days; a bare digest is unreadable in review; Renovate is another service to run for six images. The script talks to the registry API directly, so it runs in Gitea Actions without Docker
- **2026-09-19.** The production overlay replaces port lists (`!override`, `!reset`) and publishes only 443; `Caddyfile.production` is baked into the frontend image and selected by command
  - Rejected: A `FRONTEND_PORT` variable in the base file; a separate full production compose file; bind-mounting the Caddyfile
  - Why: Compose merges port lists, which left `8081:80` published beside 443. The e2e overlay already uses the same tags; a second full file would drift; a bind mount fails when the Docker daemon cannot see the checkout, as in CI
- **2026-09-19.** HSTS is sent without `includeSubDomains` and without `preload`
  - Rejected: Adding `includeSubDomains`
  - Why: The hostname is operator-chosen and private; sibling subdomains may serve plain HTTP, cookies are host-only, and an internal name cannot be preloaded
- **2026-09-19.** The frontend dependency audit blocks CI only for shipped packages (`nub audit --prod`); development-only advisories are printed
  - Rejected: Failing on every advisory; no audit
  - Why: On 2026-09-19 the full audit listed 13 advisories, all denial-of-service issues in build tooling (brace-expansion, browserslist, fast-uri, linkify-it, baseline-browser-mapping) that never reach the browser; blocking on them would stop unrelated work until upstream releases
