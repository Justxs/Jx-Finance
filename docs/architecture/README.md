# Architecture

How the code works, in prose: behaviour and mechanisms a reader could not infer from the code alone. One page per area; the feature pages under [features](../features/README.md) are the map, these pages are the detail.

## Overview

The browser requests `/api` on the same origin. Vite proxies that path during development; Caddy proxies it to the API in Compose. Endpoints validate and delegate to feature services. Services use AppDbContext directly. Domain types have no framework dependencies, enforced by architecture tests. Generated client code is isolated under frontend/src/api/generated.

A tag's behaviour lives in its `Services` folder behind interfaces in its `Interfaces` folder, and endpoints, jobs and other services inject the narrowest interface they need. A service that grows past one concern is split along its seams, each part with its own interface: transactions into `TransactionQueryService` and `TransactionWriteService`, net worth into `AssetService`, `DebtService` and `NetWorthService` (totals and history), and installation settings by area (`SettingsService`, `SmtpSettingsService`, `MarketPriceSettingsService`, `DiscordSettingsService`, `ExchangeRateSyncService`). A private helper two parts need becomes an internal static class in the same folder (`TransactionResponses`, `DebtTracker`, `OwnerDeletion`, `StoredSettings`). A helper two tags need moves to `Common` or to the owning tag's `Shared` folder, as `BackupDatabase` and the other backup readers did for the member export, `ContactSplitMarks` for the ledger, `PriceSyncRules` for the market price settings and `MonthlyDigest` for the digest job.

The architecture tests in `JxFinance.Tests/Architecture` hold these rules. `LayeringTests` keeps EF and `Infrastructure.Data` out of endpoints, keeps `Domain` free of everything, keeps `Infrastructure` outside the background jobs and all of `Common` from depending on `Endpoints`, and lets a type in one tag reach another tag only through its `Interfaces`, `Shared` or request and response namespaces, never its `Services`; Dashboard and Reports read each other's `Shared` types, which that allows. `QueryFilterTests` fails when an entity in the model has no `QueryFilters.Owner` filter and is on neither of its lists, the global types (identity, sessions, tokens, settings, rates, securities, outboxes and the audit log) and the child types read only through a filtered parent (`TransactionLine`, `TransactionTag`, `AssetValuation`, `DebtBalanceEntry`, the split shares, `CategorizationRuleTag`, `DeletionChange`, `DuplicateDismissal`, `TransferImport`), and when a file outside its approved list calls a bare `IgnoreQueryFilters()`. `AdminRouteTests` pins the routes that need the administrator role, every backup route among them, the way `TokenReadableTests` pins the token-readable reads and `AuthorizationTests` the anonymous routes; a new admin route, entity or filter bypass is a deliberate edit to one of those lists.

EF query filters enforce visibility, including the optional narrowing to one active household. Each entity carries them as two named filters: `QueryFilters.SoftDelete` hides deleted rows, `QueryFilters.Owner` holds the ownership, sharing or account reach. A query that needs to look past one of them drops that one — `IgnoreQueryFilters(QueryFilters.OwnerOnly)` reaches another person's rows while deleted ones stay hidden — and only a query that also wants deleted rows, such as the trash, the retention purge or a backup, drops both with a bare `IgnoreQueryFilters()`. Administrative/background operations that bypass filters constrain their queries explicitly. Financial writes use decimal values, and repeat-sensitive operations use transaction-scoped PostgreSQL advisory locks. The net-worth scheduler creates a separate context per user so ordinary ownership filters still apply.

Startup applies pending EF migrations directly. Only in the Development environment it then runs `DevDataSeeder.SeedAsync`, which creates a passwordless `dev@localhost` user and its starter categories when the database has no user at all; first-run setup takes that user over. Every other environment starts with an empty user table: `IsSetupNeededAsync` is true while no user has a password, `ProvisionAdminAsync` creates the administrator and gives it the starter categories itself through `StarterCategories.SeedAsync` (`Infrastructure/Data/StarterCategories.cs`, also used when an administrator creates a user and by the demo data command; the dev seeder only calls its `AddAsync`), so production and the end-to-end stack never hold a placeholder account. Schema changes are versioned. Database dump, backup scheduler and offsite copies were removed by request on 2026-09-05 and stay removed; the API image does not install PostgreSQL client tools. The backups an administrator takes from Settings are written by the application itself, see Backup and restore below.

## Pages

| Page | Sections |
| --- | --- |
| [System diagrams](diagrams.md) | System context; Deployment; Components; Backend layering; Request lifecycle; Notification fan-out; Core domain; Contract and code generation |
| [Frontend data, loading and tables](frontend-data.md) | Table filtering and sorting; Frontend loading and failure states |
| [Frontend components and forms](frontend-components.md) | Frontend file layout; UI components; Forms |
| [Visual system and motion](visual-system.md) | Visual system; Brand assets; Motion |
| [Accessibility and keyboard shortcuts](accessibility.md) | Accessibility conventions; Keyboard shortcuts |
| [Tests and Storybook](testing.md) | Backend tests; Frontend tests; Storybook |
| [Developer tooling and package updates](developer-tooling.md) | Developer tooling; Package updates |
| [API contract and generated client](api-contract.md) | API contract and generated client |
| [Authentication](authentication.md) | Authentication |
| [Containers and the recovery command](deployment.md) | Containers; Recovery command |
| [Background work and notifications](background-jobs.md) | Background work; Notification fan-out and Discord; Recurring entry schedule |
| [Sharing and households](sharing.md) | Shared category deletion; Shareable records; Removing a household member; Shared changes written around the change tracker |
| [Transactions, imports and receipts](transactions.md) | Transactions and import workflow; Transaction aggregates and receipts; Transaction summary and bulk recategorization |
| [Multi-currency](multi-currency.md) | Multi-currency |
| [Installation settings](installation-settings.md) | Installation settings |
| [Investments](investments.md) | Investments |
| [Backup and restore](backup-and-restore.md) | Backup and restore |
