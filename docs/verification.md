# Verification

How Jx Finance is verified, what each layer covers, and the dated results recorded so far. How the suites are built and run is in [Tests and Storybook](architecture/testing.md); the recipes, hooks and CI jobs are in [Developer tooling](architecture/developer-tooling.md). What is still open before a release is in the [release checklist](release-checklist.md).

All automated checks use synthetic data in throwaway PostgreSQL 16 databases. No production records are used.

## Layers

| Layer | Run with | Covers | In CI |
| --- | --- | --- | --- |
| Backend unit and architecture | `just test-unit`, no Docker | Pure logic (money, rates, calendars, statement and receipt parsers, amortization, the journal writer) and the rules every endpoint keeps: layering, contract, feature gates, administrator routes, token scopes, query filters | `backend` job |
| Backend integration | `just test`, Docker | The whole API against real PostgreSQL: every endpoint's success, validation, access and isolation paths, jobs, imports, backups | `backend` job |
| Frontend unit and DOM | `nub run test` | `src/lib`, the API client, stores, hooks, feature helpers, shared components, translation keys, theme contrast, and the request bodies of the settings, users, auth, category and tag forms | `frontend` job |
| Stories | `just test-stories` | Every story's `play` function and an axe scan, in jsdom; stories tagged `browser-only` are skipped | `frontend` job |
| Contract | `just gen-check` | The committed API contract and generated client match the API | `client-drift` job |
| End to end | `just e2e`, Docker | Playwright specs in `frontend/e2e` against a throwaway Compose stack over HTTP | `e2e` job |
| Production overlay | `just verify-production`, Docker | HTTPS, published ports, security headers, Secure cookies, a session surviving an API restart, host filtering | `production-overlay` job |
| Static | `just check-fast` | Backend format, style and build; frontend types, lint and format; docs links and DESIGN.md | `backend`, `frontend` jobs and the pre-commit hook |
| Manual | Storybook, a browser, the real host | Look and feel in both themes and languages, colour contrast beyond the theme tokens, the checks below | none |

Size as of 2026-10-03: 615 unit, 25 architecture and 1,210 integration test methods (`[Fact]` and `[Theory]`) in eight parallel collections; 127 frontend test files; 313 story files; 22 Playwright specs.

## Results recorded on 2026-10-03

Measured on the 12-thread development machine.

| Check | Result |
| --- | --- |
| Backend, whole suite | 2,517 tests passed, in about 2.5 to 3 minutes |
| `just test-unit` | 1,174 tests passed, in about 20 seconds |
| Frontend `nub run test` | 2,553 tests passed |
| `nub run test:stories` | 2,331 passed, 2 skipped (`browser-only`) |

The end-to-end suite, the production overlay and the app and Storybook builds are not part of this record.

## Earlier passes

The full detail of these is in the git history of this file.

- **2026-09-06**, the first full pass: 85 backend and 6 frontend tests, lint, types, the production build, generated-client stability and `docker compose config` all passed. A browser acceptance pass covered sign-in, budgets, goals, transactions, transfers, CSV import with transfer matching, bill confirmation, net worth, reports, both themes and both languages, and every signed-in page at 320, 768 and 1440 pixels. These were browser viewport checks, not phones. Docker was unavailable, so nothing containerized ran.
- **2026-09-19**, operations: `scripts/verify-production.mjs` passed 24 of 24 checks on commit 686de01 plus that day's operations files, both Caddyfiles validated, the API image runs as a non-root user and holds no development backups, and `just audit` found no vulnerable shipped package.

## What automated checks do not show

No feature added from 2026-09-20 on has been used by a person, and none has met a real host, a real SMTP server, a real Discord webhook, real bank or broker files, or a passkey on a real device. Certificate trust on client devices and the administrator recovery command inside the container are unverified, and the CI workflow has not run on the Gitea runner. The [release checklist](release-checklist.md) keeps the open items and the [backlog](backlog.md) the order to do them in.

## Double-entry journal

The member export's `ledger.beancount` is checked in CI by `JournalChecker`, a C# reading of the Beancount rules the writer relies on. Beancount itself is a manual check, needed once before the journal is trusted and again after a change to `Common/Journal`:

1. `pip install beancount fava` on a developer machine.
2. Restore a backup of the owner's real ledger into a development installation, sign in as the owner and press "Download my data" in Settings › Personal › Import and export.
3. Unzip `ledger.beancount` and run `bean-check ledger.beancount`: no output means every transaction balances and every `balance` assertion, one per account and currency, holding, asset and debt, holds.
4. Run `fava ledger.beancount` and compare the balance sheet with the accounts page and the income statement with the reports; they differ only where [the feature page](features/data-export-per-user.md#double-entry-journal) says.

Not run yet: `bean-check` and Fava have never read a real download.
