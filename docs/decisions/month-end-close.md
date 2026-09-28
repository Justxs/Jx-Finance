# Month-end close: decisions

Related: feature page [Month-end close](../features/month-end-close.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Current

Implemented 2026-09-27 behind the `MonthClose` switch, on by default. A soft close: closing an ended month stores a snapshot of its report summary and of the ids of the rows dated in it, per user and per active household scope, and nothing is ever refused; a row dated in the month, or moved out of it, whose `UpdatedAt` is later than the close is drift, listed up to 100 rows with the figure differences beside it, and the month is re-closed to accept it or reopened; a reporting-currency change is reported as such and not figure by figure; the page compares the month with the previous calendar month through a new `PreviousMonth` report comparison, shows monthly budgets as of the month's last day with today's limits and net worth from the stored snapshots; users who have closed a month before are reminded on days 1 to 5 of the next month. The page is the Month close tab of the Reports hub, and the dashboard shows a prompt above the cards while the latest ended month is open or changed after closing, which "Not now" hides for that month in one browser

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-27.** The review becomes the Month close tab of the Reports hub, and the dashboard shows a prompt for the latest ended month above the cards; this replaces leaving the dashboard out, logged earlier the same day
  - Rejected: A customisable `MonthClose` dashboard card; keeping a sidebar entry of its own; a prompt that shows every visit until the month is closed
  - Why: The review is about one month's figures, so it sits beside the reports rather than taking one of the few sidebar entries left after the hubs. The prompt is where the user already looks at the start of a month, and it only appears while there is something to do. A card would need a new value in the published `DashboardCard` enum and the layout handling that goes with it, for a card that would be empty for most of the month. A prompt that cannot be dismissed turns into nagging for someone who closes later in the month, so "Not now" hides it for that month in this browser, stored as `monthClosePromptHidden` in `jx-preferences`; the next month brings it back by itself
- **2026-09-27.** Closing and reopening a month take the caller's advisory lock, and the close stamps `ClosedAt` before it reads the snapshot
  - Rejected: Catching the unique violation and retrying as an update; stamping `ClosedAt` after the snapshot
  - Why: Two tabs closing one month answered 500 on the unique index, and a close racing a reopen failed on a row deleted underneath it. An edit that committed between the snapshot and a later stamp was older than `ClosedAt`, so it never showed as drift; stamped first, it does
- **2026-09-27.** The snapshot stores the ids of the rows dated in the month (`RowIds`), not a fingerprint of each row; whether the changes moved the figures is decided once for the month
  - Rejected: A stored entry per row with the values it contributed, as first built, so that each changed row could be labelled "edited, figures unchanged" as planned
  - Why: The ids are all drift needs to tell an edited row from a new one and a row moved out from one never in the month. The figures are already compared through the report's totals and categories, the one definition of income and expense the snapshot stores; a per-row comparison would be a second definition of what a row contributes, with splits, investment entries and reporting amounts to keep in step. The page says once, above the list, that the changes left the month's figures as they were, which answers the question for the case that matters, edits that were reverted. `SimplifyMonthClose` rewrote existing snapshots to the ids
- **2026-09-27.** `MonthClose.Snapshot` is a `jsonb` column written through a `JsonSerializer` value converter with a value comparer, the way `Notification.Payload` is
  - Rejected: An EF complex type mapped with `ToJson()`, as the plan's "jsonb complex type" suggested
  - Why: The snapshot is written whole and read whole and never queried into, so EF's JSON mapping buys nothing, while the converter keeps the camel-case enum names and the serializer options the notification payload already uses, handles the nested lists without mapping each record, and let `SimplifyMonthClose` reshape old snapshots with plain SQL. The comparer compares the serialized text, so a re-close that replaces the record is saved
- **2026-09-27.** The `uncategorized` filter lives on the shared `TransactionFilterRequest`, so the list, the summary, the CSV and the PDF all honour it through `Filtered`
  - Rejected: A property of `GetTransactionsRequest` only, as planned
  - Why: The checklist counts through the summary, and the count has to equal the rows its link opens; the totals line and the exports would otherwise disagree with the list, which is what the shared filter exists to prevent. The same choice was made for `unusual`
- **2026-09-27.** `MonthCloseReminderJob` runs hourly and does nothing outside days 1 to 5 of a month
  - Rejected: A daily job, as planned
  - Why: `PeriodicJob` counts its interval from the process start, so a daily pass lands at an arbitrary hour and moves with every restart. Hourly passes find the new month within an hour of it starting in the installation time zone; a pass on any other day returns before touching the database, and the deduplication per user and month makes the repeated passes harmless
- **2026-09-27.** The dashboard card "August is ready to close" with the checklist counts was left out of v1
  - Rejected: A `MonthClose` card appended to `DashboardCard`, the plan's optional step
  - Why: The page, the sidebar entry, the command palette action and the reminder in the bell already lead to the month, for a question that comes up once a month. The plan allowed leaving the card out if the page was enough, and it can be added later without touching the rest
- **2026-09-27.** The snapshot does not store net worth at the month's end
  - Rejected: A net worth figure in the snapshot, as planned and as first built
  - Why: Nothing read it. The page takes both net worth points from the stored net worth snapshots each time, and drift compares income, expense and categories, not net worth, which moves with prices and exchange rates that are not edits to the month. `SimplifyMonthClose` dropped it from existing snapshots
- **2026-09-25.** A soft close: a snapshot of the month plus drift detection, with every write path left as it is; the edit dialogs only say that the month is closed
  - Rejected: A hard lock that refuses writes dated in a closed month
  - Why: A lock would need a check in `SaveChangesAsync` and in about eight `ExecuteUpdate` and `ExecuteDelete` sites, and exceptions for deleting a category or a tag and for a reporting-currency change, all of which legitimately rewrite old months. A snapshot gives the traceability ("what changed after I closed August") without refusing a correction. An optional lock on top stays possible later: the snapshot and the changed-rows query would stay, only the refusal would be new
- **2026-09-25.** A close belongs to one user and to the scope it was taken under: the active household, or none for "Everything"
  - Rejected: One close per household
  - Why: The figures depend on the active household filter, so a household close would be one member's snapshot of a view another member sees differently. Budgets and net worth snapshots, which the page uses, are per user already
- **2026-09-25.** Only a month that has ended in the installation time zone can be closed
  - Rejected: Closing the current month early
  - Why: A snapshot of an unfinished month would drift by design
- **2026-09-25.** The snapshot is the report summary of the month exactly as `ReportService.GetSummaryAsync` answers it
  - Rejected: A separate calculation of the month's figures
  - Why: One definition of income and expense. Drift is then a plain comparison of two answers of the same function
- **2026-09-25.** A new `ReportComparisonMode.PreviousMonth`: the same calendar span one month earlier, where a range ending on a month end ends on a month end again
  - Rejected: Reusing `PreviousPeriod`
  - Why: `PreviousPeriod` counts days, so March would meet 29 January to 28 February. The new mode also serves the reports page, as "Same period last month"
- **2026-09-25.** The page shows monthly budgets only, with usage computed as of the month's last day, and says the limits are today's limits
  - Rejected: Weekly, quarterly and yearly windows; a stored history of budgets
  - Why: Budgets keep no history of their limit, rollover or period, and a window that straddles the month cannot be split honestly. Passing the date into `BudgetUsageCalculator` instead of reading the clock was the whole change
- **2026-09-25.** Net worth is the last snapshot on or before the last day of the previous month against the last one on or before this month's last day, with the dates of both shown so a gap is named
  - Rejected: Recomputing past net worth
  - Why: Assets and debts keep only their current value, so the stored snapshots are the only history there is
