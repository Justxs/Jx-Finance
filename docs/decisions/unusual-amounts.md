# Unusual amounts: decisions

Related: feature page [Unusual amounts](../features/unusual-amounts.md).

## Current

Implemented 2026-09-26 behind the `UnusualAmounts` switch, on by default. A job every 15 minutes judges each new or edited non-split expense once against the 12 months before it — the same payee on the same account with 4 earlier rows, otherwise the category with 8 — and flags it at twice the median, four scaled median absolute deviations above it and 10 reporting units above it; the verdict is stored on the transaction and later history does not change it; a flag can be dismissed per transaction; new flags dated within 45 days notify the account owner, more than three at once as one summary, and the backfill stays silent however many passes it takes — a row notifies only when it changed after the earliest check; the same pass links bank charges to recurring entries by normalized text and reports a charge more than 3% and 0.50 above what the entry expects. The constants have not yet been tuned on real data

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/unusual-amounts.md`).

- **2026-09-29.** The job writes a page of verdicts with one `UPDATE … FROM unnest(...) RETURNING` that still matches each row's `UpdatedAt`, instead of one `ExecuteUpdate` per row; the pass stays one transaction
  - Rejected: Committing per page
  - Why: Up to 20,000 round trips a pass became about 40 statements with the same guard against overwriting an edit. Committing per page would shorten the row locks but split the verdicts from the notifications they raise, so a crash in between would leave rows checked that never notified
- **2026-09-29.** The verdict becomes an optional EF complex property `Transaction.Unusual` (`UnusualVerdict`) over the same four columns, replacing the scalar columns chosen on 2026-09-26
  - Rejected: Keeping four nullable scalars that the mapper reassembles and the save rule clears one by one
  - Why: EF Core 10 writes an optional complex property with `ExecuteUpdate` without loading or tracking rows, which was the only reason for the scalars. One property cannot be half set, the mapper passes it through, and clearing it is one assignment in `Transaction.RecheckUnusual`. The column names, and so the partial indexes, did not change, and no migration was needed
- **2026-09-27.** The job pages unchecked rows by date, then id, and writes each verdict with its own `ExecuteUpdate` that matches the `UpdatedAt` it read; the factor is capped at 9 999 999.99, and a price rise reaches the entry's owner only while that owner can still see the charged account
  - Rejected: Paging by id; one bulk update for every row without a verdict; a minimum median
  - Why: Ids are random, so a page by id was a sample of the whole history and older rows were judged against the 5 000 newest rows of a window that did not reach them, then stamped for good. A bulk update also overwrote an edit that landed between the read and the write, leaving a verdict for the old amount. A median of a cent made the factor overflow its column and stop the job for everyone. An owner who left the household must not learn about charges on an account they can no longer see
- **2026-09-27.** The backfill is silent per row, not per pass: each pass reads the earliest `UnusualCheckedAt` as the backfill start, and a newly flagged row or a price rise notifies only when the row's `UpdatedAt` is after it; with nothing checked the whole pass is silent. This replaces the first-pass-only rule below
  - Rejected: Keeping the first pass silent and later passes ordinary; storing a backfill-finished marker in the settings
  - Why: A pass takes at most 20,000 rows, so on a larger ledger the recent rows left for the second pass were notified although the plan says the backfill raises none. The earliest check is already stored and needs no new column; every write path that asks for a new check also moves `UpdatedAt`, so a real edit still notifies, and the reporting-currency change, which clears every check, restarts a silent backfill by itself

- **2026-09-26.** Open question: the unusual-amount constants (twice the median, four spreads, 10 reporting units) ship as the plan chose them. The plan's step of running the job over `just seed` demo data and a copy of a real ledger, counting the flags per month and adjusting the constants until a normal month shows a handful rather than dozens, has not been done, so the chosen values and the count are not recorded yet
  - Rejected: Not decided
  - Why: The rule was unit-tested at its boundaries, not measured against a real month. Until it is, the flag rate an owner will see is a guess; the constants live in one pure class, `UnusualAmountRule`, so tuning them is a one-file change
- **2026-09-26.** The unusual-amount verdict is stored as plain scalar columns on `Transaction` (`UnusualBasis`, `UnusualTypicalAmount`, `UnusualFactor`, `UnusualSampleSize`, beside `UnusualCheckedAt` and `UnusualDismissedAt`)
  - Rejected: An EF complex type `Transaction.Unusual`, as planned
  - Why: The job and the dismissal write the verdict with `ExecuteUpdate`, one column at a time, without loading the rows: a check is not an edit, so it must not bump `UpdatedAt` or reach the audit collector, and a pass over thousands of rows should not track them. Plain nullable columns are also what the partial indexes for the filter and the job are written over. The transaction mapper builds the response's verdict from the columns
- **2026-09-26.** The very first pass of `UnusualAmountJob`, when no transaction has ever been checked, is a silent backfill: verdicts are stored, no notification is raised and no price is compared
  - Rejected: Notifying only rows created after the feature was deployed, as planned; notifying the backfill as well
  - Why: The migration leaves every existing row unchecked, and flagging a year of history into the bell would bury the one alert that matters. "Nothing checked yet" needs no deployment timestamp to remember. It also keeps a new installation's first import quiet. A pass takes at most 20,000 rows, so on a larger ledger the passes after the first are ordinary ones
- **2026-09-26.** The notification payload carries `Currency` beside `Amount` and `TypicalAmount`: the reporting currency for an unusual expense, the account's currency for a price rise
  - Rejected: Formatting amounts in the reporting currency on the client; putting the formatted amount in `Message`
  - Why: A price rise is compared in the charge's own currency, which need not be the reporting currency, and the bell and Discord must print the currency the numbers are in
- **2026-09-26.** The `unusual` filter lives on the shared `TransactionFilterRequest`, so the list, the summary, the CSV and the PDF all honour it through `Filtered`
  - Rejected: A parameter on `GetTransactionsRequest` only, as planned
  - Why: The totals line and the exports would otherwise disagree with the rows the reader is looking at, which is the one thing the shared filter exists to prevent. It is ignored while the feature is off
- **2026-09-26.** "Not unusual" and "Mark as unusual again" live in the badge's popover, with an undo toast after dismissing
  - Rejected: Entries in the ledger's row menu, as planned
  - Why: The popover is where the reason for the flag is shown, so the decision is made next to the evidence and the row menu keeps only what applies to every row. The badge also appears in the dashboard's recent transactions, which have no row menu, and works the same there
