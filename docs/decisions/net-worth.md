# Net worth: decisions

Related: feature page [Net worth](../features/net-worth.md).

## Current

### Net worth

Includes full balances of all visible accounts plus personal assets minus debts; this is not an ownership-percentage calculation

### Snapshot schedule

Refresh today's snapshot hourly and on viewing; unique user/date; no invented historical points

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-19.** Net worth totals beyond numeric(18,2) are answered and the day's snapshot is skipped
  - Rejected: Rejecting an asset or debt whose sum with the others would not fit; widening the snapshot columns
  - Why: A write-time rule cannot cover account balances and holdings, which also feed the total, so the 500 would remain reachable. Wider columns need a migration for values no household has. Skipping matches what already happens when a rate is missing
