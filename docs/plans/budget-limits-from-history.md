# Plan: Budget limits from history

Status: planned 2026-09-28. Size S. It has no dependencies. Build it before [Cash-flow forecast](cash-flow-forecast.md), which reuses the median helper this plan moves into `Common`.

## Outcome

- In "Add budget", choosing a category and a period fills the limit with what that category usually costs in that period: the median of its spending in the last six complete windows, rounded up to a whole unit. A hint under the field says "Median of the last 6 months: €312" and lists the six amounts, oldest first.
- Typing a limit wins. Changing the category or the period refills the field only while the user has not typed in it.
- A category with fewer than three complete windows of history gets no prefill. The hint says "Not enough history yet".
- The edit form shows the same hint for the budget's category and period. It never changes a stored limit.
- The budgets page ends with a short section, "Steady spending without a budget". It lists up to five expense categories that had spending in each of the last six months, varied little, and have no monthly budget.
- Each row there shows the category, "about €312 a month" and a button "Create €320 monthly budget". One click creates the budget through the existing `POST /api/budgets`. The budget then appears in the list above and the row leaves the section.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Statistic | The median of the attributed spend per window, zero windows included | The mean; the last window only | One holiday month cannot move a median. Subscription detection and unusual amounts made the same choice for the same reason |
| Which windows | The six complete windows before the one that holds today: `BudgetWindow.For(today, period, firstDayOfWeek).Shift(-1)` back to `Shift(-6)`. Windows that end before the earliest transaction the caller can see are dropped. At least three must remain | Including the current window; six calendar months whatever the period | The current window is partial and would pull the median down. A window from before the ledger started is a zero that means "not recorded yet", not "spent nothing" |
| Spend source | `ICategoryAttributionService` over the whole span, bucketed per window in memory, as `BudgetUsageCalculator` does | A new spending query | Split proration and visibility stay in one place, so the prefill equals what the budget would have shown in those windows |
| Rounding | Round the median up to a whole unit of the reporting currency | The exact median; rounding to tens | A typed limit is a round number. Rounding to tens would distort a small weekly budget |
| "Steady" | All six monthly windows above zero, a median of at least 20 reporting units, and a spread (median absolute deviation × 1.4826) of at most 25% of the median | Coefficient of variation; any category with spending | The robust spread is the one the unusual-amount rule uses. The floor keeps bank fees and one-off categories out of a five-row list |
| Candidates | Monthly only, largest median first, at most five | A list per period | Most budgets are monthly. Four lists would repeat the same categories |
| One click | The button calls the existing create mutation with the rounded median, `monthly` and rollover off | Opening the create form prefilled | The form already prefills. The button exists to save the form. The new budget is editable at once |
| Dismissal | None in v1. A category leaves the list when it gets a monthly budget or stops being steady | Stored dismissals like `SubscriptionDismissals` | Five rows at the bottom of the page are quiet enough. See open questions |
| Where it is computed | On the server, one endpoint per period that answers every visible expense category | In the browser from the transaction list | The client has no per-window attributions, and split proration lives on the server |

## Data model

None.

## Backend steps

1. **Median in one place.** Move `UnusualAmountRule.Median` to a new `Common/Statistics.cs` as `Statistics.Median(IReadOnlyList<decimal>)`. Add `Statistics.Spread(values, median)`, which is the median absolute deviation times `MadScale` (1.4826, moved from `UnusualAmountRule`). `UnusualAmountRule.Evaluate` and `PriceRiseRule.Expected` call these. Their behaviour does not change, and `UnusualAmountRuleTests` stays green without edits.
2. **Pure rule.** `Endpoints/Budgets/Shared/BudgetHistory.cs` holds the constants `Windows = 6`, `MinimumWindows = 3`, `SteadyMinimumMedian = 20m` and `SteadyMaxSpreadRatio = 0.25m`. It has two functions:
   - `SuggestedLimit(IReadOnlyList<decimal> spend)` returns the median rounded up to a whole unit. It returns null when there are fewer than three windows or the median is zero.
   - `IsSteady(IReadOnlyList<decimal> spend)`.
3. **Service.** `IBudgetSuggestionService.GetAsync(BudgetPeriod period, ct)`, implemented in `Endpoints/Budgets/Services/BudgetSuggestionService.cs`:
   - It builds the six windows from `clock.Today` and `IInstanceSettingsStore.Current.FirstDayOfWeek`.
   - It reads the earliest visible transaction date with one `MinAsync` over `db.Transactions`, and drops the windows that end before it.
   - It runs one `GetAttributionsAsync(new DateWindow(first.Start, last.End), null, FlowType.Expense, ct)` and buckets the result per window and category.
   - It lists the visible expense categories, and marks `hasBudget` from the caller's budgets of that period.
   - Categories with no spend at all are left out.
4. **Endpoint.** `GET /api/budgets/suggestions?period=monthly` lives in `Endpoints/Budgets/GetBudgetSuggestions/`, with the endpoint, request, validator and summary. It sits in `BudgetsGroup`, so it is gated by `Budgets`.
   - `period` is required and validated with `IsKnownEnum`. No new error code is needed.
   - The response is `BudgetSuggestionsResponse(BudgetPeriod Period, IReadOnlyList<BudgetSuggestionResponse> Categories)`.
   - Each item is `BudgetSuggestionResponse(Guid CategoryId, string CategoryName, IReadOnlyList<BudgetWindowSpend> Windows, decimal? Median, decimal? SuggestedLimit, bool IsSteady, bool HasBudget)`, with money attributes on the amounts.
   - `BudgetWindowSpend(DateOnly Start, DateOnly End, decimal Spent)` publishes the inclusive last day as `End`, like `windowEnd`.
   - Keep the endpoint thin: it calls the service only.

## Frontend steps

1. **Contract.** Run `just gen`. `invalidation.ts` needs no new rule: `/api/budgets/suggestions` is under `/api/budgets` (`isUnder`), so the budget mutations and every ledger mutation already refresh it. Add a case to `invalidation.test.ts` that proves it.
2. **Route.** The `/budgets` loader also warms `getBudgetSuggestionsSuspenseQueryOptions({ period: "monthly" })`, which serves both the section and the form's default period.
3. **Form.** `CreateBudgetForm` reads the monthly suggestions with the suspense hook, so the first limit is filled in `defaultValues` and needs no effect.
   - The category and period fields get `listeners.onChange`. The handler reads the chosen period's suggestions with `queryClient.fetchQuery(getBudgetSuggestionsQueryOptions({ period }))`. When the limit field is not dirty, it calls `form.setFieldValue("limitAmount", suggestedLimit)`. This is an event handler, so no `useEffect` is involved.
   - The hint under `MoneyInputField` shows the median and the six amounts, or the not-enough-history sentence.
   - In edit mode it shows the hint only.
4. **Section.** Add `features/budgets/budget-suggestions/budget-suggestions.tsx` below the list on `BudgetsPage`, in its own `QueryBoundary`.
   - It keeps the items with `isSteady && !hasBudget`, sorted by median and capped at five, and renders nothing when none are left.
   - Each row links the category name to the ledger, filtered to that category and the six windows' range.
   - The button uses `useCreateBudget` with `notify(t("budgets.suggestions.created"))`, and `pendingId` shows which row is pending.
5. **Texts.** Add `budgets.suggestions.*` and `budgets.historyHint*` in `locales/en` and `locales/lt`.
6. **Stories.**
   - The form: prefilled; typed over and then the period changed; not enough history; edit with a hint.
   - The section: candidates, none, pending and `failWith`.

## Tests

- **Unit:**
  - `BudgetHistoryTests`: the median with zero windows; fewer than three windows; rounding up (312.01 gives 313, 312.00 stays 312); the edges of the steady rule.
  - `StatisticsTests` for the moved median and spread.
  - On the client, a `create-budget-form` test proves a typed limit survives a period change.
- **Integration** (`BudgetSuggestionTests` in `Integration/Budgets`):
  - The monthly median is taken from six months, with a split line attributed by its share.
  - The current month is excluded, and months before the first transaction are dropped.
  - Weekly windows follow `FirstDayOfWeek`.
  - `hasBudget` is true only for a budget of the same period.
  - Spending on an account shared into the active household counts, as it does on the budgets page, and another user's personal account does not.
  - A malformed period answers 400 `enum.invalid`, and the switch off answers 404 `feature.disabled`.

## Docs

- `docs/features/budgets.md`: a new section, "Limits from history", covering the windows, the median, the steady rule and the section on the page.
- `docs/decisions/budgets.md`: a log entry with the rows above, and an update to Current.
- `docs/features/unusual-amounts.md`: name `Statistics` where it describes the median and the spread, if it names `UnusualAmountRule` for them.
- `docs/api.md`: the new route.
- `docs/backlog.md`: move "Budget limits from history" from section 4 to Done.

## Open questions

- Should a candidate be dismissible, stored per user like subscription dismissals, or is it fine that it stays listed until it gets a budget?
- The steady thresholds (at least 20 units, a spread of at most 25%) are guesses. Confirm or change them after the daily-use trial.
