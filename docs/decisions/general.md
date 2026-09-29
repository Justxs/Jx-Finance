# General: decisions

Related: architecture [Architecture](../architecture/README.md).

## Current

### Architecture

One API project, feature services use EF directly, thin endpoints, architecture tests

### Release scope

Ledger, planning, reporting, multi-currency, investments, tags on transactions, description-based categorization rules and administrator backups are in; machine-learned categorization, live investment prices, offline and wider sharing stay deferred

### Database lifecycle

Apply EF migrations directly on startup; the `pg_dump` based dump, the backup scheduler and offsite copies removed on 2026-09-05 stay removed. Backups exist again in a different form, see [Backup and restore](backup-and-restore.md)

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** A background job that works as one user resolves its services from a user scope (`CreateUserScope`, which sets `JobUser`) and never builds a context or a service by hand; `AppDbContext.For`, `NotificationPublisher.For` and `UnusualAmountService.For` are removed
  - Rejected: Keeping `AppDbContext.For` with `ActivatorUtilities` for the jobs with small graphs and the user scope for the deep ones
  - Why: Two mechanisms meant every job author chose again, and the hand-built graphs had already drifted from DI: `NetWorthSnapshotter` constructed five services by hand, so any new constructor parameter broke it at run time only. The scope costs nothing measurable and gives the job exactly what a request would get
- **2026-09-23.** `AppDbContext.SaveChanges` throws `NotSupportedException`
  - Rejected: Keeping `GetAwaiter().GetResult()` around the audit collector; duplicating the collector synchronously
  - Why: Nothing in the product, in Identity's stores or in the migration and seeding paths calls the synchronous save, so the blocking call was a deadlock kept alive for no caller. A second synchronous audit path would be a second place for the log to be wrong
- **2026-09-22.** Every feature maps with a static class of `ToEntity`, `ApplyTo` and `ToResponse` extension methods called by the service; services take requests and return `Result<TResponse>`, and an update validates the request before `ApplyTo` touches the tracked entity
  - Rejected: FastEndpoints' `Mapper<,,>` attached to the endpoint with services passing entities and an `Action<T> apply` (the old pattern of tags, categories, net worth, recurring entries, rules and notifications); keeping the mappers as injected singletons
  - Why: Two patterns meant two places a response could be built and two answers to "who validates what". An endpoint-attached mapper cannot see values only the service's queries produce, which is why half the features had already moved their mapper into the service. A mapper that holds no state has nothing to inject, and a static class makes every input — the reporting currency included — an explicit argument. Validating before applying keeps a failed update from leaving a dirty entity in the change tracker
