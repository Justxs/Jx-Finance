# Plan: Refunds

Status: planned 2026-09-28. Size M. It extends the matcher of [imports matched to hand-entered rows](../features/bank-statement-import.md#entries-you-already-made-by-hand) so a refund typed in by hand is linked to the bank's credit. It is independent of [Generic CSV import](generic-csv-import.md), whose card statements bring in the most refunds. [Household settle-up](household-settle-up.md) and [Spending by payee](spending-by-payee.md) should count spending the way this plan defines it.

## Outcome

- A returned purchase is recorded as a refund: money back, in an expense category. It lowers that category's spending, the month's expenses and the budget, and raises the account balance. Income stays what was earned.
- The transaction form has a third choice beside Expense and Income: Refund. It takes a positive amount and an expense category, and has no split.
- An expense row in the ledger has a "Record refund" action. It opens the form as a refund linked to that row, with the same account, category, tags and currency, the description "Refund: {description}" and the full amount, ready to lower.
- A linked refund shows "Refund of {description}, {date}" on its row. The original shows a "Refunded €12.00" mark, carried by text and not by colour alone.
- In the import review, an incoming bank row can be recorded as a refund, linked or not. When the row is a camt.053 reversal, or an expense with the same payee and at least the same amount was booked on the account in the 90 days before, the row starts as a refund of that expense, in its category.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| What a refund is | An expense with a negative amount. `Transaction.Type` stays `Expense`, and `Amount` and `ReportingAmount` are negative | A new `FlowType.Refund`; an `IsRefund` flag with a positive amount | Every total already sums `ReportingAmount` over `Type == Expense`, so a negative amount nets out with no change: attributions, reports, dashboard, month close, budgets, the ledger summary, the PDF and the account balance. A new flow type would break the rule that a category's type equals the transaction's, and every `Type == Expense` filter would need `or Refund`. A flag would need a sign flip in each of those sums, and one missed sum silently inflates spending |
| The API | `amount` is signed for an expense: negative means a refund. Income stays positive. Responses carry the stored signed values. The client reads a refund as `type === "expense" && amount < 0` | A positive `amount` plus `isRefund` | One number end to end. Responses and exports then agree with the database and with every total, with no second field to keep in step |
| Validation | `TransactionInputValidator`: income amounts stay `IsPositiveMoney`, and expense amounts become a new `IsNonZeroMoney` (`money.nonZero`). A negative amount with lines answers `transaction.splitNotAllowed` | Allowing split refunds | A split refund needs negative lines and a rule for mixed signs. A returned item is one category almost always; the ledger can split the original |
| Link | Optional `RefundOfTransactionId`. It must name a visible, non-refund expense other than itself, or the save answers `transaction.refundOriginalInvalid`. The link is checked when the refund is written, not when the original is edited later | A required link; a link table allowing one refund for several purchases | Many refunds come without a findable original, such as a price adjustment or a cashback. One refund for one purchase is the common case |
| How much | Refunds are not capped at the original's amount | Refusing a refund total above the original | Shipping refunds, goodwill credits and currency differences exceed it legitimately. The "Refunded" mark shows the total, so a typo is visible |
| Date | A refund is dated when the money came back, in the period it arrives in | Backdating it to the purchase | It matches the bank and the balance. A closed month does not drift because a shop paid back later |
| Category | Must be an expense category, by the existing category-type rule. Uncategorized is allowed | Copying the original's category without a choice | "Record refund" prefills it; the user can still change it |
| A category below zero | A category whose refunds exceed its spending in a period keeps its negative net in breakdowns, ordered last. Charts draw only positive items, and a negative item's share bar is empty. The list still adds up to the total | Clamping at zero; moving the excess to income | Clamping hides money and breaks the totals |
| Checks that assume spending | Unusual amounts, subscription detection, price rises and debt payment candidates ignore refunds. Categorization rules with an amount range never match one, because the range compares the signed amount | Letting refunds into those baselines | A refund is not a charge. It would drag a payee's median down and could be offered as a loan payment |
| Import | `ImportConfirmRow.AsRefund` records an incoming row as a refund: the service writes `Expense` with the negated amount. `RefundOfTransactionId` links it. Preview adds `RefundCandidate` (an `ImportMatchedTransaction`) and starts the row as a refund when there is a candidate or the row is a reversal | Keeping reversals as income; linking automatically without review | The reversal chip already says what the row is; this makes the default match it. The candidate is a proposal in the same "Record as" picker the transfers and hand-entered links use |
| Refund candidate | An expense, not a refund, on the same account and in the same currency, dated at most 90 days before the row. Its `SubscriptionDescription.Normalize` key must equal the row's (payee first, else description), and its amount must be at least the row's. Of those, the most recent wins | A fuzzy text match; any account | The normalizer is what subscription detection and unusual amounts already trust for "same payee". Money comes back to the card it left |
| Hand-entered refunds | `ManualEntryMatcher` compares signed money in, so a hand-entered refund of 12.00 matches an incoming bank row of 12.00 | Leaving refunds out of matching | Otherwise the refund typed at the till is imported a second time as income |

## Data model

| Change | Detail |
| --- | --- |
| `Transaction.RefundOfTransactionId?` | `TransactionId`, a foreign key to `Transactions` with `OnDelete(SetNull)`, overriding the Restrict convention so the retention purge of an original can run. Partial index on it where not null, for the "Refunded" total |
| Negative amounts | No schema change: `Amount` and `ReportingAmount` are `numeric(18,2)` and have no check constraint. Only `Type == Expense` rows may be negative, which the validators and the import enforce |

## Backend steps

1. **Rules.** In `Common/Validation/DecimalRules.cs`, add `IsNonZeroMoney` with the new `ErrorCodes.MoneyNonZero` (`money.nonZero`). `TransactionInputValidator` applies `IsPositiveMoney` to income and `IsNonZeroMoney` to expense. It also refuses lines when the amount is negative (`transaction.splitNotAllowed`). New `ErrorCodes.TransactionRefundOriginalInvalid` (`transaction.refundOriginalInvalid`). Both codes get English and Lithuanian text.
2. **Entity and migration.** Add `RefundOfTransactionId` to `Transaction`, configure the foreign key and index, then run `just migrate-add AddTransactionRefunds`.
3. **Write path.**
   - `ITransactionInput`, `CreateTransactionRequest` and `UpdateTransactionRequest` gain `RefundOfTransactionId?`, and `TransactionMapper.ApplyTo` copies it.
   - `TransactionService` checks the original in the same query it already makes for the category: visible, `Expense`, not negative, and not the row itself.
   - `ITransactionValuation.ValueAsync` is given the signed amount, so the reporting amount comes out negative at the same rate.
4. **Read path.**
   - `TransactionResponse` gains `RefundOf?` (`Id`, `Date`, `Description`), and null when the original is no longer visible.
   - It also gains `RefundedAmount?`: the reporting-currency total of the visible refunds pointing at the row, as a positive number.
   - Both are read with one query over the page's ids, the way `DebtPayment` is.
5. **Totals.** No change in any of these, which net refunds already. Each gets a test (see Tests).
   - `AccountMovements.SumAsync`: `-t.Amount.Amount` is positive for a refund, so the balance rises.
   - `TransactionService` summary (`GetTransactionsSummary`): expense total is net.
   - `ReportService`: totals, trend (`ReadTransactionFlowsAsync`) and tag breakdown (`BuildTagBreakdownAsync`) are net.
   - `CategoryAttributionService` and `CategoryBreakdownBuilder`: category nets. `Weight` already orders a negative item last.
   - `DashboardService`: month totals, trend and category breakdown are net.
   - `BudgetUsageCalculator`: `spent` is net in the refund's window, and a rollover carries the difference. Notifications already raised stay; a refund never raises one.
   - `MonthCloseService`: snapshot totals and drift are net. A refund dated in a closed month is drift like any late edit.
   - `TransactionsPdfDocument` totals are net.
   - `ExportTransactionsEndpoint` CSV writes the signed amount with type `Expense`, so a spreadsheet sum of the Expense rows is net spending.
6. **Places that must ignore refunds.** Each adds `Amount > 0` or `ReportingAmount > 0` to its expense filter:
   - `UnusualAmountService`, for the history and the candidates. A refund candidate gets no verdict, so `UnusualAmountJob` marks it checked and never flags it.
   - `AppDbContext.ApplyEntityRules`, which clears the verdict when an edit makes the row a refund.
   - `SubscriptionDetectionService` and `PriceRiseMatcher`.
   - `NetWorthService.PaysDebt` and the payment candidate list.
   `RuleMatcher` needs nothing, because its range compares the signed amount.
7. **PDF.** In `TransactionsPdfDocument`, the type cell of a negative expense reads "Refund", and the amount keeps its sign.
8. **Import.**
   - `ImportConfirmRow` gains `AsRefund` and `RefundOfTransactionId?`. `ImportConfirmValidator` allows `AsRefund` only on an income row with no transfer account and no `ExistingTransactionId`, and answers the new `import.refundInvalid` otherwise.
   - `ImportService.AddRowsAsync` writes such a row as `Expense` with `-row.Amount`. The category must be an expense category (`category.wrongType`), and the original is checked by the same helper as step 3, moved to `Common/Refunds/RefundOriginal.cs`.
   - `import.refundInvalid` gets English and Lithuanian text like the codes in step 1.
   - `PreviewAsync` adds `RefundCandidate` to `ImportPreviewRow`. It comes from one query over the account's positive expenses in the 90 days before the earliest income row, grouped in memory by normalized key. Duplicate rows and rows with a `MatchedTransaction` get no candidate.
   - `ManualEntryMatcher` compares signed money in: income is positive and an expense negated, so a refund entry fits an income line of the same size. `LinkEntry` needs no change beyond using `Fits`.
9. **Summaries.** Update `CreateTransactionSummary`, `UpdateTransactionSummary`, `GetTransactionsSummarySummary`, `ImportPreviewSummary` and `ImportConfirmSummary` for the signed amount, the link and the candidate.

## Frontend steps

1. `just gen`. The mutations keep their invalidation roots, and a refund also invalidates the budgets and dashboard roots the way any transaction save does.
2. **Amount display.** `signedAmount` in `features/transactions/transaction-amount/transaction-amount.tsx` shows "+" for a negative expense, in the foreground tone rather than the income tone. `TransactionAmount` adds a "Refund" `Tag` beside it. The same helper serves `use-transaction-columns.tsx`, `transactions-list.tsx` and `recent-transactions-list.tsx`.
3. **Form.**
   - The `type` segments in `transaction-form.tsx` gain Refund. The form's own field is `"expense" | "income" | "refund"`, while the API values stay the generated `FlowType`.
   - `use-transaction-form.ts` sends `type: "expense"` with the negated amount and `refundOfTransactionId`.
   - Loading a negative expense, a template or a duplicate selects Refund with the positive amount. The schema keeps `positiveMoney`, because the field always holds the size.
   - Refund shows the expense categories, hides the split switch and shows a read-only "Refund of {description}, {date}" line with a clear button when linked.
   - `transaction-draft.ts` carries `refundOfTransactionId`.
4. **Row action.** "Record refund" in `transaction-row-actions.tsx` for a positive expense opens the create form with a `TransactionDraft` built from the row.
5. **Marks.** On a refund row, "Refund of …" links to the original through the ledger's existing search. On an original, "Refunded €12.00" is a `HintTag` next to `AttachmentCount`.
6. **Breakdowns.** `components/breakdown-list/breakdown-list.tsx` computes shares over the positive items only and gives a negative item an empty bar with its signed amount. `components/category-breakdown/category-breakdown.tsx` and the dashboard's `category-breakdown-chart` draw positive items only.
7. **Import review.**
   - `preview-rows.ts` gains `asRefund` and `refundOfTransactionId`. `toPreviewRows` starts a row with a `refundCandidate`, or an `isReversal` income row, as a refund in the candidate's category, and selected. `takesCategory` is unchanged, since a refund takes a category.
   - `import-transfer-picker.tsx`'s "Record as" gains "Refund of {date} {description}" when there is a candidate, and "Refund" always for income rows.
   - The row's category list switches to expense categories while `asRefund` is set, and a "Refund" mark joins the flags.
   - `import-section.tsx` sends both fields.
   - `summarizeSelection` needs no change, because the bank amount and direction are what moved.
8. **Copy.** Add `transactions.refund`, `recordRefund`, `refundOf` and `refunded`, and `imports.refund` and `refundOf`, plus the three new `serverErrors` texts. All in English and Lithuanian.
9. **Stories and tests.**
   - The form in Refund mode, linked and unlinked.
   - A ledger row of each kind.
   - A breakdown with a negative category.
   - An import row proposed as a refund, from a reversal and from a candidate.
   - `preview-rows.test.ts` cases for the defaults.
   - Fixtures in `storybook/fixtures/transactions.ts` and `imports.ts`.

## Tests

- **Unit:**
  - `IsNonZeroMoney`;
  - `ManualEntryMatcherTests` for a refund entry against an income line;
  - `AccountMovementsTests` for a refund raising the balance;
  - `CategoryBreakdownBuilder` ordering a negative item last;
  - `UnusualAmountRuleTests` or the service test for a refund getting no verdict;
  - `SubscriptionDetectionTests` ignoring a refund.
- **Integration:**
  - Validation:
    - A refund is created, read back with its negative amount and its `refundOf`, and the original answers `refundedAmount`.
    - A refund with lines, a negative income, an original that is income, a refund, the row itself or another user's are each refused with their codes.
  - Totals:
    - One expense of 50.00 and a refund of 20.00 in the same month give 30.00 in the report total, the category breakdown, the tag breakdown, the dashboard month, the ledger summary and the budget's `spent`.
    - The account balance rises by 20.00.
    - The CSV holds `-20.00`, and the PDF totals are net.
  - The refund dated in the next month lowers that month only, and a closed month does not drift.
  - Soft-deleting the original hides `refundOf`, and the retention purge sets the link to null.
  - Import:
    - A camt.053 reversal is proposed as a refund.
    - A Swedbank credit from the same payee within 90 days gets a `refundCandidate`.
    - Confirming with `asRefund` writes a negative expense in the chosen category and links it.
    - `asRefund` on an expense row answers `import.refundInvalid`.
    - A hand-entered refund is offered as a link to the bank's credit.
  - The unusual-amount job and subscription detection ignore refunds, and a refund is never offered as a debt payment.

## Docs

- `docs/features/transactions.md`: a "Refunds" section covering:
  - what a refund is;
  - the form's third choice;
  - "Record refund";
  - the link and the two marks;
  - that refunds cannot be split.
- `docs/decisions/transactions.md`: dated Log entries for "What a refund is", "The API", "Link" and "How much", and Current updated.
- `docs/data-model.md`: `RefundOfTransactionId`, and where negative amounts are allowed. Change "Transactions carry account, date, flow type, amount" to say the amount is signed for refunds.
- `docs/architecture/transactions.md`: the list of totals that net refunds and of checks that ignore them. This is the mechanism a reader cannot infer from one file.
- `docs/features/reports.md`, `budgets.md`, `dashboard.md` and `month-end-close.md`: one sentence each on how a refund counts, including a category below zero.
- `docs/features/unusual-amounts.md`, `recurring-bills.md` (subscriptions and price rises) and `debt-amortization.md`: refunds are ignored.
- `docs/features/exports.md`: the signed CSV amount and the PDF's "Refund" type.
- `docs/features/bank-statement-import.md`: recording a row as a refund, the candidate rule and hand-entered refunds.
- `docs/decisions/swedbank-csv-import.md`: a Log entry for the refund default in the review.
- `docs/api.md`:
  - the signed amount;
  - `refundOfTransactionId`, `refundOf` and `refundedAmount`;
  - `asRefund` and `refundCandidate`;
  - the new codes.
- `docs/scope.md`, `docs/features/README.md` ("Not implemented" names refunds) and `docs/backlog.md`: remove the Transactions gap and the idea row, and add a Done row.

## Open questions

- Should the ledger's type filter get a separate "Refunds" value, or is "Expense" with the Refund mark enough? The plan adds none.
