# Plan: Bills calendar

Status: planned 2026-09-30, reviewed against the code the same day. Size M. A month view of recurring entries on the page that already holds them (Plan › Recurring entries), behind the existing `RecurringBills` switch. Build after nothing.

## Outcome

- **Views.** The recurring entries page gains a **List | Calendar** switch in its header. List is today's page. Calendar shows one month as a grid of weeks starting on the configured first day of the week, with Previous, Today and Next buttons. The view and the month are in the URL (`?view=calendar&month=2026-10`), so the back button and a bookmark keep them. In Calendar view the cash-flow forecast chart is hidden, while the create button and the subscription suggestions stay.
- **Chips.** Each day lists its occurrences as chips, each with a shape mark (out, in, transfer), the entry's name and an amount. A variable entry shows its estimate as "≈ €41.20". Each occurrence is in one of four states:
  - **Due**: on or after today, not yet paid.
  - **Overdue**: before today, still the entry's next due date, and no matching bank row found.
  - **Paid**: a ledger row matched it; the chip shows the row's amount. If the entry itself was never confirmed, the chip adds "not confirmed", because the bank paid it but the entry still waits.
  - **No match**: a past occurrence before the entry's next due date with no matching row. Shown muted, because bank-text matching can miss a row, and a confirmed occurrence always has its own row.
- **Month totals.** Above the grid: expected out, expected in and paid out, in the reporting currency. Transfers between your own accounts count in none of them. "Partly estimated" shows when a variable estimate or a currency without a fresh rate is inside a figure.
- **Clicking a chip:**
  - The next due or overdue occurrence of an entry opens the existing confirm form.
  - Any other due chip opens the entry's edit form.
  - A paid chip opens the ledger filtered to that account and day.
- **Phone.** The same month appears as an agenda: only the days with occurrences, one per row.
- **Dashboard.** The Upcoming bills card gains a "Calendar" link to the current month.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Place | A view of the recurring entries page | A new route; a dashboard card with a grid | The product direction is fewer pages. The entries, the confirm form and the suggestions already live on this page |
| Data | A new `GET /api/recurring-bills/calendar?month=YYYY-MM` answering one month | Reusing `GET /api/accounts/forecast` | The forecast is grouped by account, leaves out entries without an account, stops at 90 days and knows nothing about past months |
| Schedule | `RecurringOccurrences` in `Common/RecurringBills/` walks an entry's dates both ways from `NextDueDate`: `After(bill, from, to)` is today's loop in `CashFlowProjection.Occurrences`, and `Before(bill, from, to)` steps back with the same cadence and anchor day, never before the entry's creation date. The forecast keeps its paid-tolerance skip and its "overdue on today" placement on top of `After` | A second enumerator; only showing future dates | One schedule rule for both views. Walking back lets a past month show what was expected, not only what was paid |
| Matching | The rows come from the loader the forecast uses (`CashFlowForecastService.HistoryAsync`), moved to `Common/RecurringBills/RecurringHistory.cs` with a `from`/`to` range, and covering expense, income and transfer entries. A row matches an occurrence of an entry with the same match keys (`PriceRiseMatcher.KeysOf`) within `PaidToleranceDays` of the date (5 days; 2 for weekly), on the entry's account when it has one. Each row pays at most one occurrence: the nearest by date, ties going to the lower entry id. Other rows near the same occurrence are ignored | `PriceRiseMatcher.LoadChargesAsync` as it is; a stored confirmation table | `LoadChargesAsync` reads expenses only, looks 13 months back with no upper bound and caps at 5000 rows. The forecast's loader already handles all three shapes. The tolerance is the forecast's own, so the two views agree on what counts as paid |
| Estimates | `CashFlowProjection.Estimate` and its constants move to `Common/RecurringBills/` beside the schedule, used by the forecast and the calendar | Calling into `Endpoints/Accounts/Shared` from the recurring-bills service | A service in one endpoint tag should not reach into another tag's shared folder |
| Currency | Paid amounts use the row's `ReportingAmount`. Due amounts are converted with `IExchangeRateService.GetLatestAsync`. A missing or stale rate leaves the amount out of the totals and sets `Partial` | Converting at the rate on the due date; "as the forecast does" | The forecast never converts to the reporting currency; it keeps account currencies. Future dates have no rate yet, so the latest one is the honest estimate, and a missing one is said aloud |
| Entries without an amount or account | Shown without an amount, left out of the totals and counted in `Unpriced`. A household entry whose account the caller can no longer see is shown without an amount and marked "account not visible", as the forecast does | Hiding them | The chip still says a payment is expected that day |
| Calendar subscription (iCal) | Not built | A `webcal://` feed per member | Calendar apps cannot send an `Authorization` header, and `docs/decisions/authentication.md` (2026-09-29) rejected tokens in query strings because query strings end up in logs. A feed would need its own decision on a secret URL. Reminders already reach email and Discord |
| Grid markup | A `<table>` with a caption, one row per week and a header row of weekday names; chips are buttons or links; no page-level hotkeys | A `div` grid with ARIA grid roles; `[` and `]` for months | A table is read correctly by screen readers with no roving focus to write. Global shortcuts live only in `lib/shortcuts.ts`, and a month switch is two Tab stops away |
| Phone body | Both bodies are rendered, the table with `hidden md:table` and the agenda with `md:hidden`; story `play` functions query inside the table by role | A breakpoint hook that renders one | Effects are not allowed and no breakpoint hook exists. The duplicate only matters to tests, which scope their queries |

## Data model

None. The calendar reads recurring entries and transactions and stores nothing.

## Backend steps

1. **Shared helpers.** `Common/RecurringBills/`:
   - `RecurringOccurrences.After(bill, from, to)` and `Before(bill, from, to)`, each capped at 64.
   - `RecurringEstimate.Of(rows)`, moved from `CashFlowProjection.Estimate` with its constants.
   - `RecurringHistory.LoadAsync(db, bills, from, to, ct)`, moved from `CashFlowForecastService.HistoryAsync`.
   - `RecurringMatch.Assign(occurrences, rows)`, which applies the matching rule.
   `CashFlowProjection` and `CashFlowForecastService` call them, and their tests keep passing unchanged.
2. **Slice.** `Endpoints/RecurringBills/GetBillsCalendar/`:
   - **Request:** `GetBillsCalendarRequest(string Month)`. The validator uses `IsMonth()`, which answers `month.invalid`. A month more than 12 months from today either way is refused by the service with `range.invalid`, because it needs `IClock`.
   - **Response:** `BillsCalendarResponse(DateOnly From, DateOnly To, decimal ExpectedOut, decimal ExpectedIn, decimal PaidOut, bool Partial, int Unpriced, IReadOnlyList<BillOccurrence> Occurrences)`.
   - **Occurrence:** `BillOccurrence(DateOnly Date, Guid BillId, string Name, RecurringBillShape Shape, decimal? Amount, string? Currency, bool Estimated, BillOccurrenceStatus Status, bool IsNextDue, bool Unconfirmed, bool AccountNotVisible, Guid? AccountId, Guid? TransactionId)`.
   - `BillOccurrenceStatus` is `Due`, `Overdue`, `Paid` or `NoMatch`.
   The group is `RecurringBillsGroup`, so the route is gated by `Feature.RecurringBills` and token-readable.
3. **Service.** `IRecurringBillService.GetCalendarAsync(month, ct)` in `Endpoints/RecurringBills/Interfaces`, implemented in `RecurringBillService`:
   1. It reads the active visible entries, respecting the household filter and the active household.
   2. It builds each entry's occurrences in the month: `Before` for dates before `NextDueDate`, `After` from `NextDueDate` on.
   3. It loads the rows from the month's first day minus the tolerance to its last day plus the tolerance, assigns them, and sets each status:
      - `Paid` when a row matched;
      - otherwise `Overdue` for the next due date before today, `NoMatch` for earlier past dates, and `Due` for the rest.
   4. It computes the totals under the currency rule.
4. **Tests list.** `GET /api/recurring-bills/calendar` joins `TokenReadableTests.ReadableRoutes`.

## Frontend steps

1. `just gen`. In `src/api/invalidation.ts`, `getBillsCalendarQueryKey` is added by name to:
   - the recurring-bill rules,
   - the transaction, transfer, conversion and import rules,
   - the broker sync rule.
   Those rules do not reach `/api/recurring-bills` today.
2. **Route.** `routes/recurring-bills.tsx` gains `validateSearch` with `view: optionalParam(z.enum(["list", "calendar"]))` and `month: optionalParam(z.string().regex(MONTH_KEY_PATTERN))`, like `routes/index.tsx`. The loader warms the calendar query only for the calendar view, using the current month when none is given.
3. **Week rows.** `monthWeeks(month, weekStartsOn)` in `lib/calendar.ts` returns the weeks of a month with the leading and trailing days of the neighbouring months.
4. **Components.**
   - `features/recurring-bills/bills-calendar/bills-calendar.tsx`:
     - The header shows the month name, and Previous, Today and Next move by `shiftMonth` through the route's search.
     - The totals go through `SummaryStats`, with "Partly estimated" and "{{count}} without an amount" notes.
     - The body is the `<table>` of `monthWeeks` (`hidden md:table`), with today highlighted through `useToday` and the week start from `useWeekStartsOn`, plus the agenda list (`md:hidden`).
   - `features/recurring-bills/bill-chip/bill-chip.tsx` renders one occurrence: the shape mark, the name, the amount through `useMoney` (with "≈" when estimated), the status tag and the "not confirmed" or "account not visible" note.
     - The chip finds its entry in `useRecurringBillsSuspense` by `billId`.
     - For the next due occurrence it opens `RecurringBillConfirmForm` with that entry.
     - For other due chips it opens the edit form through the page's `useEditableList`.
     - For paid chips it renders a `TransactionsLink` with `accountId`, and with `dateFrom` and `dateTo` set to the day.
5. **Page.** `recurring-bills-page.tsx` gains a `SegmentedControl` List or Calendar in the header, bound to `view`, and renders `BillsCalendar` or today's list with `CashFlowForecast`.
6. **Dashboard.** `upcoming-bills.tsx` gains a "Calendar" link to `/recurring-bills?view=calendar`.
7. **Text.** English and Lithuanian keys under `recurringBills.calendar`: `list`, `calendar`, `previous`, `today`, `next`, `expectedOut`, `expectedIn`, `paidOut`, `partial`, `unpriced`, `due`, `overdue`, `paid`, `noMatch`, `unconfirmed`, `accountNotVisible`, `amountUnknown` and `empty` ("No recurring entries fall in this month"). Also `dashboard.upcomingBills.calendar`. Weekday names come from `Intl`.
8. **Stories.**
   - `bills-calendar.stories.tsx` covers the default month, an overdue entry, a variable estimate, a paid past day, a "not confirmed" paid chip, a "no match" past chip, an entry without an amount, an empty month, loading, a `failWith` error, the phone viewport, and a Monday and a Sunday week start. A `play` clicks the next-due chip inside the table and sees the confirm form.
   - `bill-chip.stories.tsx` covers each status and shape.
   - `upcoming-bills.stories.tsx` shows the new link.

## Tests

- **Unit:**
  - `RecurringOccurrences.After` and `Before` theories for each cadence: month-end anchors, a range across `NextDueDate`, no date before creation, and the cap.
  - `RecurringMatch.Assign`: the tolerance, the nearest-row rule, one row with two entries, two rows for one occurrence.
  - The existing forecast tests pass after the moves.
  - `lib/calendar.test.ts` for `monthWeeks`: each week start, a month of six weeks, February in a leap year.
- **Integration:** `GetBillsCalendar`:
  - **Statuses:**
    - A monthly entry appears once and a weekly one four or five times.
    - A variable entry carries the median estimate.
    - An overdue next occurrence is `Overdue`, and a matching bank row makes it `Paid` with `Unconfirmed`.
    - A past occurrence with no row is `NoMatch`.
    - An inactive entry is left out.
  - **Totals and currency:**
    - A foreign-currency entry without a rate sets `Partial`.
    - An entry without an account and amount counts in `Unpriced`.
    - Transfers stay out of the totals.
  - **Visibility:** a household-shared entry appears for the partner, the active household narrows it, and a partner who cannot see its account gets `AccountNotVisible`.
  - **Validation and access:** a bad month answers `month.invalid`, one 13 months away `range.invalid`, and the switch off `feature.disabled`.

## Docs

- `docs/features/recurring-bills.md`: a **Calendar** section covering the four states, how a row is matched, the totals and their currency rule, the phone agenda, and the missing iCal feed with the reason.
- `docs/decisions/recurring-bills.md`: a Log entry for matched bank text over stored confirmations, the shared schedule and history helpers, the currency rule and the rejected iCal feed.
- `docs/features/cash-flow-forecast.md`: the helpers it now shares.
- `docs/features/dashboard.md` (the link), `docs/user-flows.md`, `docs/api.md` and `docs/scope.md` §Recurring entries.

## What must be true to ship

1. On the seeded ledger, every past month shows each monthly entry as Paid exactly when the ledger has its matching row.
2. For the next 30 days, the calendar's Due and Overdue occurrences agree with the forecast's recurring entries for every entry that has an account.

## Open questions

None.
