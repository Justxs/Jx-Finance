# Exports: decisions

Related: feature pages [Exports](../features/exports.md) and [Data export per user](../features/data-export-per-user.md); architecture [Transactions, imports and receipts](../architecture/transactions.md) and [Backup and restore](../architecture/backup-and-restore.md#the-member-export).

## Current

**Data export per user.** A member downloads their own records from Settings › Personal › Import and export as one zip streamed to the browser: `data.json` in the backup's table format (`jx-finance-user-export`, version 1) and three CSVs, with attached files only when asked. "Their own" is what they own plus everything on their own accounts, the transfers touching them and the rows those point at; secrets, sessions, household rows and other members' accounts never leave this way. The file is not re-importable yet and taking it sends no notification; both were decided while the owner was away and should be reviewed.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** The two open questions of the member export plan: the file is not re-importable in version 1, and taking it leaves no notification. Decided while the owner was away; review both
  - Rejected: Declaring `jx-finance-user-export` a public contract now and shipping or promising an importer; a "Your data was downloaded on …" notification
  - Why: Nobody has asked to move a member between installations, and an importer has to decide what to do with references to rows it does not have. The format already carries `format` and `version` and `BackupReader` reads it, so declaring it a contract later costs a version bump rather than a redesign; until then the feature page says the file is not re-importable. A notification would be the only trace of a stolen session taking the data, but the same session can already read every one of these records through the API and the CSV export without any trace, so it would protect nothing new and add a notification kind. The download is logged with the member's id. This is the conservative answer to both and is easy to reverse
- **2026-09-29.** The member export writes its zip through `DeferredWriteStream`, which holds synchronous writes in memory until the next asynchronous write or flush
  - Rejected: `AllowSynchronousIO` for this one request; building the archive in a temporary file and streaming the file
  - Why: .NET 10's async zip API still writes an entry's trailer and the central directory synchronously, which Kestrel refuses. Allowing synchronous IO would block a thread on the response and break the rule the rest of the API keeps; a temporary file would leave personal data on the server, which the streamed design exists to avoid. Only those small trailers are ever buffered
- **2026-09-29.** "Their own" in the member export is four kinds of row: what the member owns; everything on their own accounts, whoever entered it; every transfer with a side on their accounts; and the categories, tags and securities their rows point at
  - Rejected: Everything the member can see; only what the member created
  - Why: "Everything visible" would take the history of a partner's shared accounts, which is the household's and is what the administrator's backup is for. "What I created" would split one account's history between two files and leave out of the member's own account what their partner entered on it. The referenced rows are few and already visible to the member, and without them the ids in the file would mean nothing
- **2026-09-29.** The member export never includes password hashes, stamps, two-factor secrets, passkeys, API token hashes, sessions, the broker token, Discord webhooks, households, memberships, the activity log, outboxes, installation settings or market data
  - Rejected: Including the encrypted secrets, as the backup does
  - Why: An encrypted secret is unreadable on any other installation and useless to a person. Household rows belong to all members, not to one. `UserExportTablesTests` fails when a table of the model is left unclassified or an exported column is named like a secret
- **2026-09-29.** `data.json` of the member export is the backup's table format with its own `format`, the member's rows and allowed columns only, soft-deleted rows included; the three CSVs cover accounts, transactions and transfers
  - Rejected: API response shapes; a restorable backup; a CSV for every table
  - Why: Response records carry computed values and there are dozens of them, while a table dump covers a new entity the day it is mapped and `BackupReader` reads it. A restore truncates the whole installation, so it cannot take a partial file. The CSVs are for a spreadsheet, and those three are what people read there; `transactions.csv` shares `TransactionCsvWriter` with the transaction export
- **2026-09-29.** The member export streams synchronously as a plain `GET` link, attachments optional and off, no size cap, no password, three an hour and one at a time per member
  - Rejected: A background job with a notification and a download link; `fetchFile` into a blob; a size cap; asking for the password
  - Why: A job would keep a copy of personal data on the server and need a table, an expiry, a sweep and a second authorized route, while personal-scale data streams in seconds. A blob holds the whole archive in the tab. A cap would refuse exactly the member with the most history. The signed-in session can already read every one of these records, so a password protects nothing new and would force a `POST`. The concurrency guard is `pg_try_advisory_xact_lock` in the two-key space (`AppLock.UserExport`, `hashtext` of the member id), so it never collides with the one-key locks other services take on the member id
- **2026-09-29.** The member export reads through explicit ownership predicates: `UserExportTables` conditions for `data.json` and `IgnoreQueryFilters(QueryFilters.OwnerOnly)` with "account owned by the member" for the CSVs, all on the request's own connection
  - Rejected: `AppDbContext.For(services, userId)` as the plan proposed, relying on its query filters with no active household
  - Why: The query filters answer "what can I see", which includes a partner's shared accounts, so the CSVs needed an ownership predicate anyway. A second context would also open a second connection outside the `REPEATABLE READ` transaction, and the file would no longer be one snapshot. Ignoring the owner filter makes the export independent of `X-Active-Household` by construction
- **2026-09-29.** The Import and export section of Settings › Personal is always listed, and the bank statement import inside it still follows the `Import` switch
  - Rejected: Hiding the section with the import switch; a separate Export section
  - Why: The export is always on, so a hidden section would make it unreachable on an installation without imports. One section keeps the product's direction of fewer pages

- **2026-09-20.** The CSV export loads the tag map of the filtered set in one query before it starts streaming rows
  - Rejected: A correlated collection projection inside the streamed query; a lookup per row
  - Why: EF cannot translate a `string_agg`, and a collection projection inside an `AsAsyncEnumerable` query buffers, which is the thing the streaming export exists to avoid. A lookup per row is the per-row query the ledger must never do. A join row is two uuids, so the map is a fraction of the ledger it describes and the rows themselves are still written one at a time
- **2026-09-19.** CSV export streams rows from the database into the response; PDF export refuses more than `App:PdfExportMaxRows` rows (5000) with `export.tooManyRows`
  - Rejected: Materializing every row for both; streaming the PDF
  - Why: MigraDoc lays the whole document out in memory, so a PDF cannot be streamed and needs a cap; CSV needs none
