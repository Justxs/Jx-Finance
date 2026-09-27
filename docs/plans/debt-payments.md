# Plan: Debt payments linked to a debt

Implemented 2026-09-27; see [Debt amortization](../features/debt-amortization.md#tracking-payments). Built more simply than planned in three places: the tracked rows and balance live in `NetWorthService` and the debt response rather than a new service and a new schedule field, the Link payments dialog lets the server choose each kind (edited on the row afterwards), and the ledger link and unlink are row action buttons rather than menu items.

Status: planned 2026-09-26. Size M. Independent of the other plans. It reads better after [Asset value history](asset-value-history.md) only because both touch `ComputeTotalsAsync` and `NetWorthSnapshotter`.

## Outcome

A debt can track its payments. The owner links expense transactions to it, either by hand or automatically when a linked recurring entry is confirmed. The debt's outstanding balance is then the last balance the owner stated, minus the principal part of every linked payment since that date. The interest part of each payment is worked out from the debt's rate, or typed from the bank statement.

The debt page lists the payments with their interest and principal. It shows the tracked balance against the contract schedule, and "Use scheduled balance" is no longer the only way to keep a debt current.

## Today

- `OutstandingAmount` and `AsOf` are typed by hand. Net worth subtracts `OutstandingAmount` and nothing else.
- The amortization schedule is computed per request and changes nothing; its "Use scheduled balance" button is an ordinary `PUT`.
- A recurring entry has no link to anything it posted, and a posted transaction has no link back.
- [Debt amortization](../features/debt-amortization.md) lists this feature under "Not covered".

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Balance | Derived on read. For a debt with `TracksPayments` on, the balance is `OutstandingAmount` at `AsOf` (the anchor) minus the principal of linked payments dated after `AsOf`. Editing the balance sets a new anchor | Changing `OutstandingAmount` on every linked payment, with sync in transaction update, delete, restore and import | Derivation makes edits, deletes, trash restores and a housemate's changes to a shared-account row correct with no hooks at all. The conversion-fee precedent shows how many places a stored side effect has to be kept in step |
| Principal part | Each link has a kind. For a **regular** payment, interest is `round(balance before × rate / 12)` and principal is the rest. An **extra** payment is all principal. An optional `Principal` on the link overrides the calculation with the bank's own split. With no rate, or a zero rate, everything is principal | Reducing by the full amount; reading the contract schedule's row | The full amount overstates repayment by the interest. The schedule assumes the contract balance, not the real one. `AmortizationCalculator.MonthlyRate` already gives the monthly rate |
| Default kind | Recurring confirmations are regular. A manual link is regular unless a regular payment already exists in that calendar month, in which case it is extra | Always asking | Right in the common case, and editable on the link |
| What can be linked | Expense transactions, not split, on any account the owner can see. Also expense recurring entries | Transfers to an "Other" account standing for the loan; split lines | The loan account would count in net worth next to the debt, so it would be counted twice. A line id is replaced on every edit, so it is no stable target |
| Where the link lives | A `DebtPayment` row owned by the debt's owner, pointing at the transaction | A `DebtId` column on `Transaction` | Debts are personal, but a transaction on a shared account is editable by housemates. A column on the transaction would let their edit form see or change it. A row under the owner filter cannot be touched by them |
| Reports | Unchanged: the whole payment stays an expense in reports and budgets | Counting principal as savings | A separate question with its own consequences for budgets. Listed under later |
| Currency | A payment in another currency than the debt's is converted at the rate on its date. A missing rate marks the balance incomplete, and it is shown with a note | Refusing the link | Same rule as everywhere else. A euro debt paid from a euro account never needs a rate |

## Data model

| Change | Detail |
| --- | --- |
| `Debt.TracksPayments` | `bool`, default `false`. Existing debts behave exactly as today |
| New `DebtPayment` (`OwnableEntity`) | `DebtId`, `TransactionId`, `Kind` (Regular/Extra), `Principal?` (decimal 18,2, in the debt's currency). Unique filtered index on `TransactionId`, so one transaction pays at most one debt. Foreign keys cascade on hard delete from both `Debt` and `Transaction`, overriding the Restrict convention, so the retention purge of either takes its links. A soft delete on either side leaves the link, and the derivation skips it |
| `RecurringBill.DebtId?` | Expense shape only. Foreign key `SetNull`, so purging a debt does not block on schedules |

Migration: `AddDebtPayments`.

## Backend steps

1. **Pure rules.** `Common/Amortization/DebtBalance.Track(anchorAmount, anchorDate, annualRate, payments)` returns the balance and one row per payment. Payments are ordered by date and then by creation. A row carries the date, the amount in the debt's currency, the interest, the principal, the balance after, and whether the principal was typed. Principal is capped at the balance before, and a payment beyond payoff shows the excess as "overpaid". Unit-test it:
   - regular then extra in one month;
   - a typed principal;
   - a zero rate and no rate;
   - payoff mid-list;
   - payments before the anchor ignored;
   - rounding to cents.
2. **Service.** `DebtPaymentService` (in `Endpoints/NetWorth/Services`):
   - **Link** refuses:
     - a transaction the owner cannot see (`reference.notFound`);
     - one that is not an expense (`debt.paymentWrongType`);
     - one that is split (`transaction.splitNotAllowed`);
     - one already linked (`debt.paymentTaken`, 409);
     - a debt without `TracksPayments` (`debt.notTracked`).
   - **Update** sets the kind and principal.
   - **Unlink** is a hard delete, since a link is a pointer and needs no trash entry.
   - **Balance** loads the links and their transactions through the owner's filters in one query. Soft-deleted or no-longer-visible transactions are left out and counted as `Unavailable`. It converts foreign amounts with the preloaded rate history and calls `DebtBalance.Track`.
3. **Debt endpoints.**
   - `DebtResponse` gains `TracksPayments`, `TrackedBalance?`, `TrackedIncomplete` and `UnavailablePayments`.
   - `UpdateDebtRequest` gains `TracksPayments`. Editing `OutstandingAmount`/`AsOf` is the "new anchor" action.
   - New routes:
     - `GET /api/debts/{id}/payments`: the tracked rows plus the transaction's account, description and link id;
     - `POST /api/debts/{id}/payments` with `{ transactionId, kind?, principal? }`;
     - `PUT /api/debts/{id}/payments/{paymentId}`;
     - `DELETE /api/debts/{id}/payments/{paymentId}`;
     - `GET /api/debts/{id}/payment-candidates?from`: unlinked, non-split expenses since the anchor, ordered by how well they match. Matches score by the linked recurring entry's name, by a description seen on earlier links, and by an amount near the schedule's regular payment.
   - `GET /api/transactions` rows gain `DebtPayment?` (debt id and name) only when the caller owns the link. A housemate sees nothing.
4. **Net worth.** `ComputeTotalsAsync` subtracts `TrackedBalance` for tracking debts and `OutstandingAmount` for the rest. An incomplete tracked balance makes the total incomplete, so no snapshot is written. That is the same rule as a missing rate. Update `NetWorthSnapshotter` with the new dependency, and add a test that the job's total equals the endpoint's.
5. **Recurring entries.**
   - The validator accepts `DebtId` only on the expense shape and only for the caller's own debt (`recurringBill.debtShape`, `reference.notFound`).
   - `ConfirmAsync` adds a regular `DebtPayment` for the posted transaction inside its transaction and lock.
   - `RecurringBillResponse` gains `DebtId`.
   - `TrashRestorers.RestoreRecurringBillAsync` clears a `DebtId` whose debt is gone rather than refusing.
6. **Schedule page data.** `DebtScheduleResponse` gains `TrackedBalance?`, so the page can draw the tracked balance against the contract line.
7. **Error codes:** `debt.paymentWrongType`, `debt.paymentTaken`, `debt.notTracked`, `recurringBill.debtShape`.

## Frontend steps

1. `just gen`. In `invalidation.ts`:
   - The link mutations refresh debts, the debt's schedule and payments, net worth and transactions.
   - Transaction, transfer, import and recurring-confirm mutations also refresh debts and schedules, because a derived balance moves when a linked row changes.
   - Add `serverErrors` texts in both locales.
2. **Debt form.** A "Track payments" switch with one sentence on what it does. When it is on, the amount and date fields are labelled "Balance on" to make the anchor clear.
3. **Debt page.**
   - The summary shows the tracked balance beside the recorded anchor and the scheduled balance.
   - A payments table has date, account and description, amount, interest, principal (marked when typed), balance after, kind, and edit and unlink actions. It shows unavailable payments as a line of text.
   - A "Link payments" dialog lists the candidates with checkboxes and a kind per row.
   - `DebtBalanceChart` gains a tracked-balance series.
4. **Ledger.** A "Pays debt: Mortgage" marker on linked rows for the owner, and "Link to debt…" and "Unlink from debt" in the row menu. The link action opens a small dialog with the debt select, kind and optional principal.
5. **Recurring form.** A "Pays debt" select for the expense shape, listing the caller's debts that track payments.
6. **Stories.**
   - The debt page: tracking with payments, not tracking, an incomplete rate, unavailable payments, paid off, pending and `failWith`.
   - The link dialog.
   - The ledger marker.
   - The recurring form with a debt.
   - Fixtures in `storybook/fixtures/net-worth.ts` and `recurring-bills.ts`.

## Tests

- **Integration:**
  - Linking a regular payment lowers the tracked balance by its principal, and an extra payment lowers it by its full amount.
  - A typed principal wins over the calculation.
  - A new anchor ignores earlier payments.
  - Deleting the transaction raises the balance again, and restoring it from the trash lowers it again, with no link changes.
  - A housemate editing the amount of a linked shared-account row moves the owner's balance, but the housemate sees no link.
  - A second link of the same transaction is refused.
  - Income and split rows are refused.
  - A foreign-currency payment is converted, and one with a missing rate marks the balance incomplete, with no snapshot.
  - Confirming a recurring entry with a debt creates a regular link.
  - Net worth uses the tracked balance.
  - Purging a debt or a transaction removes its links, and purging a debt nulls `RecurringBill.DebtId`.
  - A backup round-trip keeps the links.
  - Another user gets 404 on every route.

## Docs

- `docs/features/debt-amortization.md`: a new "Tracking payments" section with the derivation, the interest rule and a worked example, and the "Not covered" line removed.
- `docs/features/net-worth.md`: the tracked balance in the total.
- `docs/features/recurring-bills.md`: the debt link, and the sentence that posted rows are ordinary rows qualified.
- `docs/features/transactions.md`: the ledger marker.
- `docs/decisions/debt-amortization.md`: the rows above, and the 2026-09-21 "recorded amount is authoritative" decision amended to "unless the debt tracks payments".
- `docs/scope.md`.
- `docs/data-model.md`, including the fix that recurring amounts are in the account's currency, not the reporting currency.

## Later, not in this plan

- Reports and budgets counting only the interest part as an expense, with the principal as a balance-sheet movement.
- Linking payments from an import, suggested by the categorization rules.
- Interest by actual days between payments instead of a twelfth of the annual rate.
- The same pattern for assets: a purchase transaction linked to the asset.
