# Net worth: decisions

Related: feature page [Net worth](../features/net-worth.md).

## Current

### Net worth

Includes full balances of all visible accounts plus personal assets minus debts, a debt that tracks payments counting with its tracked balance; this is not an ownership-percentage calculation

### Snapshot schedule

Refresh today's snapshot hourly and on viewing; unique user/date; no invented historical points

### Asset value

An asset keeps dated valuations, today or earlier, and may depreciate on a straight line in whole monthly steps down to a residual value. The value on any date is computed from the valuations and the terms when it is read and is never stored; an asset counts in net worth from its first valuation

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-27.** Asset valuations are rows of an `AssetValuation` table, one per asset and date, removed with the asset by a cascade; `Asset.CurrentValue` and `AsOf` stay as the newest valuation, kept in step by one `AssetValuationBook`
  - Rejected: Overwriting `CurrentValue` as before
  - Why: The same shape as the security price history, which already works: a write for a date that has a row replaces it, and deleting the newest falls back to the next
- **2026-09-27.** Depreciation is a straight line in whole monthly steps on the start date's day of month, never below the residual; the terms are optional: start date, start value, life of 1 to 600 months and residual value
  - Rejected: Daily pro rata; declining balance
  - Why: Monthly steps give amounts in cents that a person can check by hand. Declining balance can come later as a second method
- **2026-09-27.** The monthly amount is `(start value − residual) / life` rounded up to the cent, so the value reaches the residual on the last step of the life at the latest and the final step is the smaller one
  - Rejected: Rounding to the nearest cent and letting the last step absorb the difference
  - Why: Rounding up needs no special last step, and the rule stays the same after a revaluation
- **2026-09-27.** A manual valuation on or after the start date restarts the decline from that value at the same monthly amount
  - Rejected: Ignoring manual valuations while depreciating; recomputing the rate from the new value
  - Why: An inspection says what the car is worth now. The loss per month is a property of the car, not of the latest guess
- **2026-09-27.** The value on a date is computed on read by a pure `AssetValue.On(date, valuations, terms)` for net worth, the list and the chart; depreciation writes no rows
  - Rejected: A job writing a monthly valuation row
  - Why: The debt schedule set the precedent: computed per request, never stored. Edited terms apply at once, with nothing to rewrite. Net worth snapshots still record what the value was each day
- **2026-09-27.** Snapshots already taken are not rewritten when a valuation is added for a past date
  - Rejected: Recomputing past snapshots
  - Why: Snapshots are the history as it was seen
- **2026-09-27.** An asset counts in net worth only on or after its earliest valuation, and valuation dates cannot be in the future
  - Rejected: Keeping `AsOf` ignored
  - Why: It makes "counts from the as-of date" true. With no future dates, today's total is unaffected except for the fix itself

- **2026-09-19.** Net worth totals beyond numeric(18,2) are answered and the day's snapshot is skipped
  - Rejected: Rejecting an asset or debt whose sum with the others would not fit; widening the snapshot columns
  - Why: A write-time rule cannot cover account balances and holdings, which also feed the total, so the 500 would remain reachable. Wider columns need a migration for values no household has. Skipping matches what already happens when a rate is missing
