# Audit log: decisions

Related: feature page [Audit log](../features/audit-log.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-21.** The household audit log is written from the `SaveChangesAsync` override of `AppDbContext`, out of the change tracker, after the soft-delete rule and before the base save, so its rows commit with the change in the same transaction
  - Rejected: An explicit `IAuditRecorder` call in each service, the way `IDeletionRecorder` is; a `SaveChangesInterceptor` registered in DI; PostgreSQL triggers
  - Why: There are two dozen write paths that touch shared rows, and an explicit call would have to compute every field's before and after in each of them; one missed call is a silent hole in a log whose only value is that it has none. The tracker already holds the original and current value of every property, so one collector covers them all, including paths added later. A DI-registered interceptor would take the scope's `ICurrentUser`, which is wrong for `BrokerSyncJob`, whose per-connection context carries its own user; the context's own override always has the right actor. Triggers would know neither the actor nor the display names. The cascade the trash avoided the interceptor for is handled explicitly: a conversion's fee is folded into the conversion
- **2026-09-21.** Only records shared into a household are logged, in the household or households a member could see them through; personal records write nothing
  - Rejected: Logging every change for every user, with the household as a filter
  - Why: The log exists to answer "who in this household did this"; a personal record has one possible actor, the owner, and logging it would grow the table with rows nobody else may ever read and invite a leak of personal data into a shared view. The visibility rule is the one the query filters already enforce, so the log can never show a member something the ledger would not
- **2026-09-21.** An update stores its changed fields as a bounded `jsonb` list of `{field, from, to}` display strings on the event, at most 12 entries of at most 120 characters each
  - Rejected: Child rows per field, like `DeletionChanges`; storing raw ids and re-resolving names on read; a full before/after snapshot
  - Why: `DeletionChanges` are ids a restore iterates and joins; these are words that are only ever read back with their event and never queried by field, so a child table would add a join to every page for nothing. Display strings are what the member saw — a category renamed later still reads as it was — and they cannot leak a field the whitelist does not name. A full snapshot would store fields (IBAN, import references, reporting amounts) a member does not see and has no bound. The caps keep a row to a few kilobytes whatever is edited
- **2026-09-21.** A Swedbank import, an Interactive Brokers statement, a bulk recategorisation or retag and a categorization-rule run write one summarising row per touched household, with a count, through `db.Audit.Summarise` before their save
  - Rejected: A row per imported or edited transaction; no row at all for bulk operations
  - Why: A statement of 800 rows would bury every other change for weeks under 800 identical "added" rows, and the individual rows are one filter away in the ledger anyway. Writing nothing would hide the one operation most likely to explain a sudden change. The summary still derives its households from the tracked changes, and the caller passes the touched accounts so a set-based update the tracker never sees is covered
- **2026-09-21.** Audit rows are pruned by a daily job after 400 days; a backup restore brings the log back as it was when the backup was taken, and the restore itself is not logged
  - Rejected: Keeping rows forever, as the trash does; a read filter only; keeping rows written after the backup across a restore
  - Why: The trash writes a row per delete; the log writes a row per edit by every member, so it is the table that grows, and unlike the trash its rows are referenced by nothing, which makes a prune safe. 400 days is a year plus the month it takes to notice. Rows written after the backup describe changes the restore undid, so keeping them would describe a history the data no longer has. A restore is an installation-wide administrator action outside any household
- **2026-09-21.** Reading a household's log answers 404 while another household is active in `X-Active-Household`, and the card of such a household hides its activity
  - Rejected: Ignoring the active household on this route, as the household list does
  - Why: The active household hides every other household's records; the log is a list of those records' history, so showing it would undo the narrowing the switcher promises. The household list stays unnarrowed only because the switcher needs it to offer a way back
