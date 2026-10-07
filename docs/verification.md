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

## Large-ledger timing on 2026-10-07

Measured in a 4-thread cloud container against a local PostgreSQL 16.15 with default settings, the API built in Release with background jobs off, and requests sent one at a time with a member's cookie.
The ledger held 100,032 transactions dated from May 2016 to October 2026: `just seed` for two members, then each member's rows copied 520 times at random dates up to ten years back, so each member sees about 50,000 rows on three accounts, 521 spread rows and 200 personal groups of six rows.
Locations and learned categories were switched on. Each request ran twice to warm up and then 15 times; the table gives the median and the 95th percentile in milliseconds, before and after this day's two fixes.

| Request | Before, p50 / p95 | After, p50 / p95 |
| --- | --- | --- |
| Ledger, page 1 of 50, any of the five sorts in either direction | 1,766–2,226 / 2,028–2,551 | 77–133 / 94–241 |
| Ledger, page 500, by date | 2,201 / 2,606 | 98 / 135 |
| Ledger search "maxima" | 5,113 / 5,788 | 147 / 194 |
| Transactions list, page 1 | 93 / 130 | 88 / 157 |
| Report, this year against the previous year | 1,925 / 2,419 | 292 / 345 |
| Report, last year against the previous period (the year review's data) | 1,929 / 2,424 | 324 / 378 |
| Report, ten years without comparison | 2,126 / 2,450 | 510 / 696 |
| Dashboard summary | 50 / 66 | 53 / 73 |
| Cash-flow forecast, 90 days | 83 / 108 | 85 / 122 |
| Bills calendar, this month | 18 / 21 | 15 / 28 |
| Recurring totals | 21 / 25 | 19 / 28 |
| Subscription suggestions | 17 / 55 | 18 / 27 |
| Place suggestions | not run | 36 / 37 |
| Uncategorized suggestions | not run | 74 / 102 |
| Month close list | not run | 27 / 34 |
| Category suggestion, which trains on the newest 10,000 rows | not run | 54 / 69 |
| Import preview of a 500-row Swedbank CSV with the learned guess | not run | 177 / 252 |
| CSV export of every row (3.4 MB) | not run | 331 / 336 |
| PDF export of this year | not run | about 900 warm, 2,500 cold |
| Member download with its journal | not run | about 1,800 to 2,300 warm, 4,900 cold |

Before, every query whose plan cost passed `jit_above_cost` was compiled by PostgreSQL's JIT: the ledger's count and page queries each spent about 1.2 seconds compiling and 45 milliseconds running. The API now turns JIT off on its connections, see [General decisions](decisions/general.md).
The report's payee labels were one correlated subquery per payee, each repeating the visibility filter; they are now one query ranking each payee's rows, which took the label lookup from about 450 to 55 milliseconds.
The member download is limited to three an hour, so it ran once per API start.

## Earlier passes

The full detail of these is in the git history of this file.

- **2026-09-06**, the first full pass: 85 backend and 6 frontend tests, lint, types, the production build, generated-client stability and `docker compose config` all passed. A browser acceptance pass covered sign-in, budgets, goals, transactions, transfers, CSV import with transfer matching, bill confirmation, net worth, reports, both themes and both languages, and every signed-in page at 320, 768 and 1440 pixels. These were browser viewport checks, not phones. Docker was unavailable, so nothing containerized ran.
- **2026-09-19**, operations: `scripts/verify-production.mjs` passed 24 of 24 checks on commit 686de01 plus that day's operations files, both Caddyfiles validated, the API image runs as a non-root user and holds no development backups, and `just audit` found no vulnerable shipped package.

## What automated checks do not show

No feature added from 2026-09-20 on has been used by a person, and none has met a real host, a real SMTP server, a real Discord webhook, a real Telegram bot, real bank or broker files, or a passkey on a real device. Certificate trust on client devices and the administrator recovery command inside the container are unverified, and the CI workflow has not run on the Gitea runner. The [release checklist](release-checklist.md) keeps the open items and the [backlog](backlog.md) the order to do them in.

## Double-entry journal

The member export's `ledger.beancount` is checked in CI by `JournalChecker`, a C# reading of the Beancount rules the writer relies on. Beancount itself is a manual check, needed once before the journal is trusted and again after a change to `Common/Journal`:

1. `pip install beancount fava` on a developer machine.
2. Restore a backup of the owner's real ledger into a development installation, sign in as the owner and press "Download my data" in Settings › Personal › Import and export.
3. Unzip `ledger.beancount` and run `bean-check ledger.beancount`: no output means every transaction balances and every `balance` assertion, one per account and currency, holding, asset and debt, holds.
4. Run `fava ledger.beancount` and compare the balance sheet with the accounts page and the income statement with the reports; they differ only where [the feature page](features/data-export-per-user.md#double-entry-journal) says.

Not run yet: `bean-check` and Fava have never read a real download.
