# Exports: decisions

Related: feature page [Exports](../features/exports.md); architecture [Transactions, imports and receipts](../architecture/transactions.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** The CSV export loads the tag map of the filtered set in one query before it starts streaming rows
  - Rejected: A correlated collection projection inside the streamed query; a lookup per row
  - Why: EF cannot translate a `string_agg`, and a collection projection inside an `AsAsyncEnumerable` query buffers, which is the thing the streaming export exists to avoid. A lookup per row is the per-row query the ledger must never do. A join row is two uuids, so the map is a fraction of the ledger it describes and the rows themselves are still written one at a time
- **2026-09-19.** CSV export streams rows from the database into the response; PDF export refuses more than `App:PdfExportMaxRows` rows (5000) with `export.tooManyRows`
  - Rejected: Materializing every row for both; streaming the PDF
  - Why: MigraDoc lays the whole document out in memory, so a PDF cannot be streamed and needs a cap; CSV needs none
