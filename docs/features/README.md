# Feature walkthrough with diagrams

Every feature the current code implements, one page per feature under `features/`, each with diagrams of how it works. The prose detail lives in the other pages; these pages are the map. Each page names the backend folder under `backend/JxFinance.Api/Endpoints`, the frontend folder under `frontend/src/features` and the routes it owns. Diagrams are Mermaid and render in Gitea, GitHub and the VS Code Markdown preview with a Mermaid extension.

## Cross-cutting pages

- [System overview](system-overview.md): deployment, the path of one request, the frontend data path and the API contract pipeline.
- [Core data model](core-data-model.md): entity-relationship diagram.

## Feature list

| # | Feature | Feature switch | Backend | Frontend |
| --- | --- | --- | --- | --- |
| 1 | [First-run setup](first-run-setup.md) | always on | `Auth/Setup` | `auth`, route `/setup` |
| 2 | [Sign-in, sessions, lockout](sign-in-and-sessions.md) | always on | `Auth` | `auth`, route `/login` |
| 3 | [Two-factor authentication and recovery codes](two-factor-authentication.md) | always on | `Auth/TwoFactor` | `profile` |
| 4 | [User management and password reset by an administrator](user-management.md) | always on, Admin | `Users` | `users` |
| 5 | [Accounts with computed balances](accounts.md) | always on | `Accounts` | `accounts` |
| 6 | [Categories](categories.md) | always on | `Categories` | `categories` |
| 7 | [Transactions, splits, filters, bulk recategorize](transactions.md) | always on | `Transactions` | `transactions` |
| 8 | [Transfers](transfers.md) | always on | `Transfers` | `accounts` (Transfers section) |
| 9 | [Multi-currency, conversions, exchange rates](multi-currency.md) | `MultiCurrency` | `Conversions`, `Currencies`, `Infrastructure/ExchangeRates` | `accounts` (Currency conversions section) |
| 10 | [Swedbank CSV import](swedbank-csv-import.md) | `Import` | `Imports` | `imports` (dialog on Settings and Profile) |
| 11 | [Budgets](budgets.md) | `Budgets` | `Budgets` | `budgets` |
| 12 | [Goals](goals.md) | `Goals` | `Goals` | `goals` |
| 13 | [Recurring entries](recurring-bills.md) | `RecurringBills` | `RecurringBills` | `recurring-bills` |
| 14 | [Notifications](notifications.md) | always on; each producer follows its own feature | `Notifications` | notification bell in the sidebar |
| 15 | [Net worth, assets, debts](net-worth.md) | `NetWorth` | `NetWorth` | `net-worth` |
| 16 | [Households and sharing](households-and-sharing.md) | `Households` | `Households` | `households` |
| 17 | [Dashboard](dashboard.md) | always on | `Dashboard` (and `users/me/dashboard-layout`) | `dashboard` (customise mode, cards chosen and ordered per user) |
| 18 | [Reports](reports.md) | `Reports` | `Reports` | `reports` |
| 19 | [CSV and PDF export](exports.md) | always on | `Transactions` (`export`, `export/pdf`), `Investments` (`tax-summary/export`) | `transactions` (`ExportMenu`), `investments` |
| 20 | [Investments, the yearly tax summary and the Interactive Brokers import](investments.md) | `Investments` | `Investments`, `Infrastructure/Brokers` | `investments` |
| 21 | [Installation settings and feature switches](installation-settings.md) | always on, Admin | `Settings` | `settings` |
| 22 | [Backup and restore](backup-and-restore.md) | always on, Admin | `Backups` | `settings` (Backups section) |
| 23 | [Background jobs](background-jobs.md) | per job | `Infrastructure/BackgroundJobs` | none |
| 24 | [Interface: languages, themes, palettes, typefaces, shortcuts, phone layout](interface.md) | always on | none | `components`, `stores`, `lib/shortcuts.ts` |
| 25 | [Administrator recovery command](admin-recovery-command.md) | command line | `--recover-admin` | none |
| 26 | [Email: SMTP settings, password reset by link, verification, reminder emails](email.md) | always on, its own enabled switch, Admin for the settings | `Settings` (`settings/smtp`), `Auth`, `Common/Email`, `Infrastructure/Email` | `settings` (Email section), `auth`, `profile` |
| 27 | [Tags on transactions](tags.md) | always on | `Tags`, and the tag parts of `Transactions` and `Reports` | `tags`, `transactions` (picker, filter, chips), `reports` (breakdown) |
| 28 | [Categorization rules](categorization-rules.md) | `CategorizationRules` | `CategorizationRules`, and the rule parts of `Imports` | `categorization-rules`, `imports` (suggestion per row) |
| 29 | [Trash and undo for delete](trash-and-undo.md) | always on; a kind follows the switch of the feature it belongs to | `Trash`, and the recorder call in each feature's delete | `profile` (Trash section), the undo toast in `useConfirmedDelete` |
| 30 | [Audit log of shared changes](audit-log.md) | `Households` | `Households` (`households/{id}/audit`), `Infrastructure/Data/Auditing`, `RetentionJob` | `households` (Activity on each household card) |
| 31 | [Receipts and attachments](attachments.md) | always on | `Attachments`, `Infrastructure/Attachments`, `AttachmentPurgeJob`, the archive format of `Backups` | `transactions` (files in the edit dialog, paperclip in the ledger) |
| 32 | [Debt amortization](debt-amortization.md) | `NetWorth` | `NetWorth` (`debts/{id}/schedule`, the repayment fields of a debt), `Common/Amortization` | `net-worth` (repayment terms in the debt form, route `/net-worth/debts/$debtId`) |

Not implemented: live prices, per-user reporting currency and language, manual exchange rates, PWA/offline, bank APIs, scheduled or offsite backups and sharing of budgets, goals, assets, debts and bills. See [Features and scope](../scope.md).

## Where to read more

| Topic | Page |
| --- | --- |
| Step-by-step user flows | [User flows](../user-flows.md) |
| Entities, money and currency rules | [Data model](../data-model.md) |
| Routes, endpoint layout, error envelope | [API surface](../api.md) |
| Every mechanism in prose, per area | [Architecture](../architecture/README.md) |
| Decisions and open questions, per topic | [Decisions](../decisions/README.md) |
