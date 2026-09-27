# Budgets: decisions

Related: feature page [Budgets](../features/budgets.md).

## Current

Weekly, monthly, quarterly or yearly limit per expense category, one budget per category and period; the window is derived from today in the installation time zone and, for weekly, from the configured first day of the week; an optional rollover carries the previous window's remainder or overspend, recomputed per read and walked back at most twelve windows or to the budget's creation

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** A budget stores a period and no dates; its window is derived from the period and today in the installation time zone, and the uniqueness rule is one budget per category and period, checked in `BudgetService` and answered with 409 `conflict.duplicate`
  - Rejected: Storing an explicit start and end per budget; keeping one budget per category whatever the period; a filtered unique index on (user, category, period)
  - Why: Stored dates would have to be rolled forward by a job or by the next read, and every installation that was switched off for a month would come back with a gap. Two budgets of one period on one category always cover the same window, so the rule is the same as "no overlap for a period kind", while a weekly and a yearly limit on groceries are two different, useful questions. The index was rejected because duplicates were reachable before this rule existed — nothing enforced the one the summary claimed — and the migration would fail on exactly those installations
- **2026-09-20.** The rollover carry is recomputed on every read by walking back whole windows, at most twelve and never past the window holding the budget's `CreatedAt`; the response publishes `limitAmount`, `carriedAmount` and `effectiveLimit` separately
  - Rejected: Storing a closed remainder per window; carrying only the previous window's base remainder without its own carry; walking back without a limit
  - Why: A stored remainder is a cache of transactions, split lines and reporting amounts that a backdated or edited expense invalidates, the same argument that keeps holdings, the portfolio series and goal progress uncached. The previous window's remainder is only meaningful once its own carry is in it, which is what makes this a walk rather than one subtraction, and an unbounded walk would replay a budget's whole history on every list. Twelve windows is a year of months and a quarter of weeks, enough for the number to be recognisable and short enough to stay one query. Three separate numbers let the page say "150 base, 12.30 carried" instead of showing a limit nobody typed
- **2026-09-20.** `CategoryAttribution` carries the transaction date, so one attribution query covers the whole span a budget list walks and is bucketed per window in memory
  - Rejected: One attribution call per budget and window; a second, budget-only projection of spending
  - Why: Thirteen windows times a page of budgets is a query storm for one screen, and a second projection would have to repeat the split proration that `ICategoryAttributionService` exists to keep in one place — the dashboard and the reports would drift from budgets the first time one of them changed. The extra column only widens the grouping of the unsplit query; every existing caller sums by category and is unaffected
- **2026-09-20.** Budget alerts fire once per budget, per window and per threshold; spending that falls back below a threshold inside the same window does not re-arm it, and a budget that passes both thresholds between two passes gets both notifications
  - Rejected: Re-arming when spending drops below the threshold again; notifying only the highest threshold crossed; one notification kind with the percentage only in the payload
  - Why: The alert reports that a threshold was crossed, and an edited or deleted transaction that dips the total under 80% for an hour is not a new event — re-arming would let one wobbling transaction notify all afternoon. Sending only the highest would silently swallow the 80% warning of a budget that jumps, and two enum kinds let each sentence be written plainly in both locales and let the deduplication query stay an index lookup instead of reading inside the payload
- **2026-09-20.** `BudgetAlertJob` runs hourly, iterates active users with a per-user `AppDbContext` and takes `AppLock.BudgetAlerts` inside each user's transaction
  - Rejected: Running every 15 minutes like the bill reminder; one advisory lock held for the whole pass; computing the spend with a second query instead of `BudgetUsageCalculator`
  - Why: Spending only moves when someone enters or imports a transaction, and each pass recomputes every budget's usage, which for a rollover budget reads up to twelve windows; hourly matches `NetWorthSnapshotJob` and keeps that cost small. The work is already split per user because the calculator reads through the ownership filter, so a lock per user's transaction is the narrowest scope that still makes the read of what was raised and the insert atomic. A second spending path would drift from the budgets page the first time either changed
