# Architecture

How the code works, in prose: behaviour and mechanisms a reader could not infer from the code alone. One page per area; the feature pages under [features](../features/README.md) are the map, these pages are the detail.

## Overview

The browser requests `/api` on the same origin. Vite proxies that path during development; Caddy proxies it to the API in Compose. Endpoints validate and delegate to feature services. Services use AppDbContext directly. Domain types have no framework dependencies, enforced by architecture tests. Generated client code is isolated under frontend/src/api/generated.

EF query filters enforce visibility, including the optional narrowing to one active household. Each entity carries them as two named filters: `QueryFilters.SoftDelete` hides deleted rows, `QueryFilters.Owner` holds the ownership, sharing or account reach. A query that needs to look past one of them drops that one — `IgnoreQueryFilters(QueryFilters.OwnerOnly)` reaches another person's rows while deleted ones stay hidden — and only a query that also wants deleted rows, such as the trash, the retention purge or a backup, drops both with a bare `IgnoreQueryFilters()`. Administrative/background operations that bypass filters constrain their queries explicitly. Financial writes use decimal values, and repeat-sensitive operations use transaction-scoped PostgreSQL advisory locks. The net-worth scheduler creates a separate context per user so ordinary ownership filters still apply.

Startup applies pending EF migrations directly. Only in the Development environment it then runs `DevDataSeeder.SeedAsync`, which creates a passwordless `dev@localhost` user and its starter categories when the database has no user at all; first-run setup takes that user over. Every other environment starts with an empty user table: `IsSetupNeededAsync` is true while no user has a password, `ProvisionAdminAsync` creates the administrator and gives it the starter categories itself through `StarterCategories.SeedAsync` (`Infrastructure/Data/StarterCategories.cs`, also used when an administrator creates a user and by the demo data command; the dev seeder only calls its `AddAsync`), so production and the end-to-end stack never hold a placeholder account. Schema changes are versioned. Database dump, backup scheduler and offsite copies were removed by request on 2026-09-05 and stay removed; the API image does not install PostgreSQL client tools. The backups an administrator takes from Settings are written by the application itself, see Backup and restore below.

## Pages

| Page | Sections |
| --- | --- |
| [Frontend data, loading and tables](frontend-data.md) | Table filtering and sorting; Frontend loading and failure states |
| [Frontend components and forms](frontend-components.md) | Frontend file layout; UI components; Forms |
| [Visual system and motion](visual-system.md) | Visual system; Brand assets; Motion |
| [Accessibility and keyboard shortcuts](accessibility.md) | Accessibility conventions; Keyboard shortcuts |
| [Frontend tests and Storybook](testing.md) | Frontend tests; Storybook |
| [Developer tooling and package updates](developer-tooling.md) | Developer tooling; Package updates |
| [API contract and generated client](api-contract.md) | API contract and generated client |
| [Authentication](authentication.md) | Authentication |
| [Containers and the recovery command](deployment.md) | Containers; Recovery command |
| [Background work and notifications](background-jobs.md) | Background work; Notification fan-out and Discord; Recurring entry schedule |
| [Sharing and households](sharing.md) | Shared category deletion; Shareable records; Removing a household member |
| [Transactions, imports and receipts](transactions.md) | Transactions and import workflow; Transaction aggregates and receipts; Transaction summary and bulk recategorization |
| [Multi-currency](multi-currency.md) | Multi-currency |
| [Installation settings](installation-settings.md) | Installation settings |
| [Investments](investments.md) | Investments |
| [Backup and restore](backup-and-restore.md) | Backup and restore |
