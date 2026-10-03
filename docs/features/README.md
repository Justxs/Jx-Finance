# Feature walkthrough with diagrams

Every feature the current code implements, one page per feature under `features/`, each with diagrams of how it works. The prose detail lives in the other pages; these pages are the map. Each page names the backend folder under `backend/JxFinance.Api/Endpoints`, the frontend folder under `frontend/src/features` and the routes it owns. Diagrams are Mermaid and render in Gitea, GitHub and the VS Code Markdown preview with a Mermaid extension.

## Cross-cutting pages

- [System overview](system-overview.md): deployment, the path of one request, the frontend data path and the API contract pipeline.
- [Core data model](core-data-model.md): entity-relationship diagram.

## Feature list

| # | Feature | Feature switch | Backend | Frontend |
| --- | --- | --- | --- | --- |
| 1 | [First-run setup and the guided setup](first-run-setup.md) | always on | `Auth/Setup`, `Dashboard` (`users/me/getting-started`) | `auth` (`setup-page`), `settings` (`setup-wizard`), route `/setup`; `dashboard` (`getting-started-card`) |
| 2 | [Sign-in, sessions, lockout](sign-in-and-sessions.md) | always on | `Auth` | `auth`, route `/login` |
| 3 | [Two-factor authentication and recovery codes](two-factor-authentication.md) | always on | `Auth/TwoFactor` | `profile` |
| 4 | [User management and password reset by an administrator](user-management.md) | always on, Admin | `Users` | `users` (Users under Installation in Settings) |
| 5 | [Accounts with computed balances](accounts.md) | always on | `Accounts` | `accounts` |
| 6 | [Categories](categories.md) | always on | `Categories` | `categories` |
| 7 | [Transactions, splits, refunds, filters, bulk recategorize](transactions.md) | always on | `Transactions` | `transactions` |
| 8 | [Transfers](transfers.md) | always on | `Transfers` | `accounts` (Transfers section) |
| 9 | [Multi-currency, conversions, exchange rates](multi-currency.md) | `MultiCurrency` | `Conversions`, `Currencies`, `Infrastructure/ExchangeRates` | `accounts` (Currency conversions section) |
| 10 | [Bank statement import](bank-statement-import.md) | `Import`; the inbox also needs `App:ImportInbox` | `Imports` | `imports` (dialog from Settings › Personal › Import and export), `settings/import-inbox-section` |
| 11 | [Budgets](budgets.md) | `Budgets` | `Budgets` | `budgets` |
| 12 | [Goals](goals.md) | `Goals` | `Goals` | `goals`, `dashboard` (`goals-snapshot`) |
| 13 | [Recurring entries](recurring-bills.md) | `RecurringBills` | `RecurringBills` | `recurring-bills` |
| 14 | [Notifications](notifications.md) | always on; each producer follows its own feature | `Notifications` | notification bell in the sidebar, `profile` (`notifications-section`: channels per kind) |
| 15 | [Net worth, assets, debts](net-worth.md) | `NetWorth` | `NetWorth` | `net-worth` |
| 16 | [Households and sharing](households-and-sharing.md) | `Households` | `Households` | `households` (Households under Shared in Settings) |
| 17 | [Dashboard](dashboard.md) | always on | `Dashboard` (and `users/me/dashboard-layout`) | `dashboard` (customise mode, cards chosen and ordered per user), `month-close` (month-close prompt above the cards) |
| 18 | [Reports](reports.md) | `Reports` | `Reports` | `reports` |
| 19 | [CSV and PDF export](exports.md) | always on | `Transactions` (`export`, `export/pdf`), `Investments` (`tax-summary/export`) | `transactions` (`ExportMenu`), `investments` |
| 20 | [Investments, the yearly tax summary and the Interactive Brokers import](investments.md) | `Investments` | `Investments`, `Infrastructure/Brokers` | `investments` |
| 21 | [Installation settings and feature switches](installation-settings.md) | always on, Admin | `Settings` | `settings` (the Installation sections of Settings), `components/settings-layout` |
| 22 | [Backup and restore](backup-and-restore.md) | always on, Admin | `Backups` | `settings` (Backups section) |
| 23 | [Background jobs](background-jobs.md) | per job | `Infrastructure/BackgroundJobs` | none |
| 24 | [Interface: navigation, languages, themes, palettes, typefaces, shortcuts, phone layout](interface.md) | always on | none | `components` (`app-sidebar`, `hub-tabs`, `section-nav`), `stores`, `lib/navigation.ts`, `lib/shortcuts.ts` |
| 25 | [Administrator recovery command](admin-recovery-command.md) | command line | `--recover-admin` | none |
| 26 | [Email: SMTP settings, password reset by link, verification, reminder emails](email.md) | always on, its own enabled switch, Admin for the settings | `Settings` (`settings/smtp`), `Auth`, `Common/Email`, `Infrastructure/Email` | `settings` (`notification-providers-section`: Email tab, `smtp-section`), `auth`, `profile` (email column of the Notifications section) |
| 27 | [Tags on transactions](tags.md) | always on | `Tags`, and the tag parts of `Transactions` and `Reports` | `tags`, `transactions` (picker, filter, chips), `reports` (breakdown) |
| 28 | [Categorization rules](categorization-rules.md) | `CategorizationRules` | `CategorizationRules`, and the rule parts of `Imports` | `categorization-rules`, `imports` (suggestion per row) |
| 29 | [Trash and undo for delete](trash-and-undo.md) | always on; a kind follows the switch of the feature it belongs to | `Trash`, and the recorder call in each feature's delete | `profile` (Trash section of Settings › Personal), the undo toast in `useConfirmedDelete` |
| 30 | [Audit log of shared changes](audit-log.md) | `Households` | `Households` (`households/{id}/audit`), `Infrastructure/Data/Auditing`, `RetentionJob` | `households` (Activity on each household card) |
| 31 | [Receipts and attachments](attachments.md) | `Attachments` | `Attachments`, `Infrastructure/Attachments`, `RetentionJob`, the archive format of `Backups` | `transactions` (files in the edit dialog, paperclip in the ledger) |
| 32 | [Debt amortization](debt-amortization.md) | `NetWorth` | `NetWorth` (`debts/{id}/schedule`, `debts/{id}/payments`, the repayment and tracking fields of a debt), `Common/Amortization` | `net-worth` (repayment terms and Track payments in the debt form, route `/net-worth/debts/$debtId` with the linked payments), `transactions/debt-payment` |
| 33 | [Discord notifications](discord-notifications.md) | always on, its own enabled switch, Admin for the switch and the webhook | `Settings` (`settings/discord`, `settings/discord/test`), `Users` (`users/me/discord-notifications`), `Common/Notifications`, `Common/Discord`, `Infrastructure/Discord`, `DiscordOutboxJob` | `settings` (`notification-providers-section`: Discord tab, `discord-section`), `profile` (`notifications-section`: Discord column) |
| 34 | [Unusual amounts and subscription price rises](unusual-amounts.md) | `UnusualAmounts`; price rises also need `RecurringBills` | `Common/Unusual`, `UnusualAmountJob`, `Transactions` (`{id}/unusual/dismiss`, the `unusual` filter), the unusual parts of `Imports` and `RecurringBills` | `components/unusual-amount-badge`, `transactions` ("Unusual only" filter), `imports` (mark per row), `recurring-bills` (price-rise line, "Matches bank text"), notification bell |
| 35 | [Month-end close](month-end-close.md) | `MonthClose` | `MonthCloses`, `MonthCloseReminderJob`, the `PreviousMonth` comparison of `Reports`, monthly budgets as of a date in `Budgets`, the `uncategorized` and `duplicates` filters of `Transactions` | `month-close` (`month-page` at `/reports/month`, the Month tab of Reports; `month-close-prompt` and `month-close-line` on the dashboard), `components/closed-month-hint` (in the transaction and conversion forms), `reports` ("Same period last month"), `transactions` ("Uncategorized" in the category filter), command palette, notification bell |
| 36 | [Cash-flow forecast](cash-flow-forecast.md) | `CashFlowForecast`; the entries in it also need `RecurringBills` | `Accounts` (`accounts/forecast`, `CashFlowForecastService`, `CashFlowProjection`) | `components/cash-flow-forecast` (under the accounts table and on the recurring entries page), `dashboard` (`cash-flow-card`) |
| 37 | [Reconciliation against a statement balance](reconciliation.md) | always on; recording from a camt.053 import follows `Import` | `Accounts` (`accounts/{id}/reconciliations`, `ReconciliationService`, `AccountMovements`), the closing-balance hook of `Imports`, the account lines of `MonthCloses` | `accounts` (`reconcile-dialog`, Reconcile row action, `?reconcile=`), `imports` (result panel), `month-close` (checklist account lines) |
| 38 | [Monthly digest and the member's language](monthly-digest.md) | `MonthClose`; each member opts in per channel | `MonthlyDigestJob`, `Common/Notifications` (`MonthlyDigest`, texts), `Users` (`users/me/language`) | `profile` (`notifications-section`: the digest row), notification bell, `stores/app-store.ts` (language saved on the server) |
| 39 | [Receipt reading](receipt-reading.md) | `ReceiptReading`, and Tesseract where the API runs | `Receipts`, `Common/Receipts`, `Infrastructure/Receipts` (`TesseractReceiptReader`, `ReceiptTextParser`), the last step of `RetentionJob` | `transactions` (`receipt-reading`: Fill from receipt and the review in the transaction form) |
| 40 | [Passkeys](passkeys.md) | always on; offered only over HTTPS or on localhost | `Auth/Passkeys`, `Auth/Services/PasskeyService.cs`, `Infrastructure/Auth` (`PasskeyStateCookie`, `PasskeySite`) | `profile` (`passkeys-section`, `password-prompt`), `auth` (passkey button on `/login`), `lib/passkeys.ts` |
| 41 | [Personal API tokens](personal-api-tokens.md) | `ApiTokens`, off by default | `Auth/Tokens`, `Auth/Services/PersonalApiTokenService.cs`, `Infrastructure/Auth` (`PersonalApiToken`, `PersonalApiTokenFormat`, `PersonalApiTokenAuthenticationHandler`), `Common/Middleware` (`PersonalApiTokenGateMiddleware`, `PersonalApiTokenRateLimit`, `IdempotencyMiddleware`), `Common/TokenReadable.cs`, `Common/TokenWritable.cs`; MCP `Common/Mcp` (`McpTools`, `McpRoute`) | `profile` (`api-tokens-section`), `transactions` (`source-mark`) |
| 42 | [Data export per user](data-export-per-user.md) | always on | `Users` (`users/me/export`, `UserExportService`, `UserExportTables`, `UserJournalSource`), `Common/Journal`, the table writer of `Backups`, `Transactions/Shared/TransactionCsvWriter` | `profile` (`export-data-panel` in the Import and export section of Settings › Personal) |
| 43 | [Household settle-up](household-settle-up.md) | `Households` | `Households` (`households/{id}/settle-up`, `shared-expenses`, `settlements`, `SettleUpService`), `Common/SettleUp`, the split marker of `Transactions`, the two kinds in `Trash`, `Retention` and `Infrastructure/Data/Auditing` | `households` (`settle-up`, `settlement-dialog`, `shared-expenses` on each household card), `transactions/shared-expense` (Split with household row action and its `split-expense-dialog`, ledger mark), `transactions/share-allocation.ts` |
| 44 | [Payee names](payee-names.md) | `PayeeNames` | `Payees`, the name parts of `Transactions`, `Reports`, `RecurringBills` | `components/payee-name-form`, `transactions/payee-naming`, `tags` (Payee names section) |
| 45 | [Live security prices](live-prices.md) | `Investments`; the daily fetch has its own switch, off by default, Admin for the settings | `Investments` (`PriceSyncService`, `securities/{id}/price-symbol/find`, `securities/{id}/prices/import`), `Settings` (`settings/market-prices`), `Infrastructure/MarketPrices`, `PriceSyncJob` | `settings` (`market-prices-section`), `investments` (price source fields of `security-form`, `price-history`) |
| 46 | [Transaction locations](transaction-locations.md) | `Locations`, off by default; the map also needs the tile file on the server | `Transactions` (`transactions/places`, `transactions/places/rename`, `PlaceService`, the `place` filter), `Common/Places`, `Reports` (`expenseByPlace`), `Infrastructure/Receipts` (`PhotoLocation`, the receipt address) | `transactions` (`place-field`, the place parts of `receipt-reading` and the filters), `reports` (`place-breakdown`, `place-map`), `places` (`places-section`, `place-rename-form`), `tags` (Places section) |
| 47 | [Transaction groups](transaction-groups.md) | none; a group is personal or shared with a household | `TransactionGroups`, `Transactions` (`transactions/ledger`, `LedgerKeys`, `groupId` and `enteredByMe`, the `Group` CSV column), the `transactionGroup` kind of `Trash` and `Retention`, the member export of `Users` | `transactions` (`ledger-groups`, `group-dialog`, Group in `selection-toolbar`, Add to group… and Remove from group in `transaction-row-actions`) |

| 48 | [Learned categories](learned-categories.md) | `LearnedCategories`, off by default | `Common/LearnedCategories`, `Infrastructure/LearnedCategories` (`--evaluate-categorizer`), `Imports` (`learnedCategoryId`, `learnedConfidence`), `Transactions` (`transactions/suggest-category`, `transactions/uncategorized-suggestions`, `CategorySuggestionService`, `onlyUncategorized` of `bulk-category`) | `imports` (the Learned mark), `components/category-suggestion`, `transactions` (`uncategorized-suggestions`, the toolbar button) |
| 49 | [Money with people outside the household](money-with-people.md) | `People`, and `Households` | `Contacts` (`contacts`, `contacts/{id}/entries`, `contacts/{id}/payments`, `contacts/splits`, `ContactService`, `ContactSplitMarks`), `Common/SettleUp` (`ContactBalances`, `SettleUpBalances`, `SplitRules`), the `contactSplit` marker of `Transactions`, the three kinds in `Trash` and `Retention` | `households` (`people-section`, `contact-form`, `contact-payment-form`, `contact-entries`), `transactions/contact-split` (Split with a person row action and its `contact-split-form`) |
| 50 | [Telegram notifications](telegram-notifications.md) | always on, its own enabled switch, Admin for the switch, the bot token and the group | `Settings` (`settings/telegram`, `settings/telegram/test`), `Users` (`users/me/telegram-notifications`), `Common/Notifications`, `Common/Telegram`, `Infrastructure/Telegram`, `TelegramOutboxJob` (on `ChatOutboxJob`) | `settings` (`notification-providers-section`: Telegram tab, `telegram-section`, `delivery-status`), `profile` (`notifications-section`: Telegram column) |

Not implemented: per-user reporting currency, manual exchange rates, PWA/offline, bank APIs and scheduled or offsite backups. See [Features and scope](../scope.md) and, for what is planned next, [Backlog and ideas](../backlog.md).

## Where to read more

| Topic | Page |
| --- | --- |
| Step-by-step user flows | [User flows](../user-flows.md) |
| Entities, money and currency rules | [Data model](../data-model.md) |
| Routes, endpoint layout, error envelope | [API surface](../api.md) |
| Every mechanism in prose, per area | [Architecture](../architecture/README.md) |
| Decisions and open questions, per topic | [Decisions](../decisions/README.md) |
