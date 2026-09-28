# Plan: Household settle-up

Status: planned 2026-09-28. Size L. Independent of the other plans. [Refunds](refunds.md) defines money back in an expense category. Once it has shipped, a payer who receives a settlement on their own account can record it as a refund of the split expense, which lowers their spending to their share without a second mechanism. The later "my share" view named under Decisions should build on that, not replace it.

## Outcome

- An expense on one of your own accounts can be split with a household from its row in the ledger: equally, by shares (2 : 1) or by exact amounts, between any of the household's members.
- The household card shows each member's balance in each currency ("Ona owes you 42.50 EUR") and the fewest payments that would settle everyone.
- "Record payment" on the card records that one member paid another. When the person recording can see an account of each of the two, it can also write the ordinary transfer between them. Otherwise it records the payment alone, and nothing is written to any account.
- Other members see a split expense on the card with its date, description, amount and their share, even when it was paid from a personal account they cannot see.
- Splits and payments show up in the household activity log, can be undone from the trash, and follow the active household like every other shared record.
- v1 cut: splits start from a transaction; balances are kept per currency; reports, budgets and net worth are unchanged.
- Later, not in v1:
  - an IOU typed on the card without a transaction;
  - a "my share" view of reports;
  - settling in one currency with conversion;
  - open balances in net worth;
  - linking a payment to an imported bank row;
  - splits posted by a recurring entry;
  - notifications.

## Today

- Only accounts, categories and tags can be shared. A transaction is visible when its account is, so a housemate never sees what was paid from your personal account.
- A transfer can already run between two members' accounts when the person recording it can see both, for example from their own account to a partner's account shared into the household. `TransferService` requires both accounts to be visible for an edit or a delete.
- Reports, the dashboard and budgets sum `ReportingAmount` over every visible transaction under the active scope. They are views of a scope, not of a person.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Where a split lives | A new `SharedExpense` row in the household, with its own date, description and amount copied from the transaction, plus one `SharedExpenseShare` row per member. The link to the transaction is shown only to the payer | Columns on `Transaction`; sharing the transaction itself | The transaction may sit on a personal account that the other members must not see. A household-level row with a snapshot is what they read. The payer-only link is the rule `DebtPayment` already follows |
| What can be split | An expense on an account the caller owns, split or not, split as a whole amount. At most one household split per transaction. Income, transfers, conversions and investment entries cannot be split | Any visible expense, including a housemate's row on a shared account | "I paid" has to be true of the caller. The account owner is the payer, so nobody can put a debt on someone else's payment |
| Visibility | New marker `IHouseholdScoped` with its own branch in `AppDbContext.OwnerFilter`: visible when the caller is a current member of the row's household, the household is not deleted, and, while a household is active, it is that household | The owner filter; no filter with a membership check on each read path, as `AuditEvent` does | The owner filter would hide the rows from the other members. A filter per read path is what the 2026-09-20 scope decision refused, because the next endpoint would forget it |
| Split methods | `Equal`, `Shares` (whole weights 1 to 100) and `Exact`. Each member's amount is computed once, when the split is saved, and stored. Cents are allocated by largest remainder, so the shares always add up to the amount; ties go in the order the members were listed | Percentages; recomputing on every read | Shares cover percentages without a rounding rule of their own. Stored amounts keep the history readable when someone joins or leaves later |
| The transaction changes afterwards | The split keeps its snapshot. When the amount differs from the transaction, the payer's ledger row says so, and "Update split" saves again with the current amount, date and description. A deleted transaction makes its split stop counting, derived on read; restoring the transaction brings the split back | Following the live amount | A live amount would break exact shares the moment the payer corrects a typo. The derivation needs no hook in the delete path, the same reasoning as debt payments |
| Balances | Derived on read, per household and per currency. Each member's balance is what they paid for others, minus what others paid for them, plus the payments they made, minus the payments they received. The suggestions greedily match the largest creditor with the largest debtor, which needs at most one payment fewer than there are members | Stored running balances | Derivation makes edits, trash restores, a deleted transaction and a removed member correct without keeping a total in step |
| Currency | Balances are kept per currency and never converted. A payment settles the balance of its own currency | Converting everything to the reporting currency at the expense's date | A rate chosen by the application is not what people actually repay, and the installation's reporting currency need not be the one they settle in. Nearly every household settles in one currency, so per-currency lines cost them nothing |
| Recording a payment | A `Settlement` row: from, to, amount, currency, date and note. The two options are: (a) create the ordinary transfer through `ITransferService.CreateAsync` in the same database transaction, from an account owned by the payer to an account owned by the payee, both visible to the person recording it and both in the payment's currency; or (b) link an existing transfer with the same checks, for example one the camt.053 import proposed from the counterparty IBAN. Without either, only the settlement is stored | Writing an expense on the debtor's account and an income on the creditor's; writing the other person's side automatically | Every write goes through the rules that exist: a transfer needs both accounts visible, and a record the caller cannot see is never touched. An income row would inflate the creditor's income, and writing into a housemate's personal account breaks ownership outright |
| Reports | Unchanged. The payer's expense counts in full wherever its account is visible. The transfer of a settlement counts nowhere, as every transfer does. The balances are a separate ledger of who owes whom that never enters reports, budgets, net worth or the month-end close | Counting only each member's share in reports | Reports are views of a scope, not of a person. A household-scoped report already sums every shared account, so subtracting shares there would count them twice. A per-person lens touches `ReportService`, `CategoryBreakdownBuilder`, `BudgetUsageCalculator`, the dashboard and the month-close snapshot at once, which is a plan of its own |
| Who may do what | Any member reads. The payer creates, edits and deletes their splits. Either party of a payment records it or deletes it. A party must be a current member, or a former member who still has an open balance in the household | Owner-only moderation | It mirrors the account rule: the person whose money it is decides |
| Member removal | Not refused. The confirmation shows the member's open balance. The rows stay, the removed member stops seeing them, and the others still see that member's balance under their name and can record a payment with them | Refusing removal while a balance is open | Removal is an owner's safety tool and must not be blocked by a debt the owner cannot clear alone |
| Deleting | Soft delete with a trash entry and the undo toast (`TrashKind.SharedExpense`, `TrashKind.Settlement`). Deleting a settlement leaves its transfer alone | A hard delete | Undo is the rule for every record since 2026-09-21. A transfer is a fact of the ledger with its own delete |
| Audit | `AuditCollector` writes created, updated, deleted and restored rows for both kinds, with the household taken from the row. Examples: "Maxima, 90.00 EUR, split 3 ways"; "Jonas paid Ona 30.00 EUR" | No logging | "Who changed what I owe" is exactly the question the activity log exists to answer |
| Switch | Gated by `Feature.Households`; no switch of its own | A new feature switch | It has no job and no notification, and it is meaningless without households |

## Data model

| Change | Detail |
| --- | --- |
| `IHouseholdScoped` | Interface in `Domain/Households` with `HouseholdId HouseholdId`. `AppDbContext.OwnerFilter` checks it before the ownable branch |
| New `SharedExpense` (`OwnableEntity`, `IHouseholdScoped`) | `Id` (`SharedExpenseId`), `UserId` is the payer, `HouseholdId`, `TransactionId`, `Date`, `Description` (max 200), `Amount` (`Money`) and `Method` (`Equal` = 0, `Shares` = 1, `Exact` = 2). `TransactionId` is required, with a foreign key that cascades on hard delete and overrides the Restrict convention, so the retention purge of a transaction takes its split. There is a unique filtered index on `TransactionId` where not deleted, and an index on (`HouseholdId`, `Date`) |
| New `SharedExpenseShare` | Plain class like `TransactionLine`: `SharedExpenseId` (cascade), `UserId` (restrict to `AspNetUsers`), `Weight?` and `Amount` (decimal 18,2, in the expense's currency). The primary key is (`SharedExpenseId`, `UserId`) |
| New `Settlement` (`OwnableEntity`, `IHouseholdScoped`) | `Id` (`SettlementId`), `UserId` is who recorded it, `HouseholdId`, `FromUserId`, `ToUserId`, `Amount` (`Money`), `Date`, `Note?` (max 200) and `TransferId?`. The transfer foreign key is `SetNull`. There is a unique filtered index on `TransferId`, and an index on (`HouseholdId`, `Date`) |
| `AccountResponse.OwnerId` | New field, so the payment dialog can offer each party's accounts |
| Enums | `AuditEntityKind.SharedExpense` and `Settlement`; `TrashKind.SharedExpense` and `Settlement`, appended |

Migration: `AddSettleUp`. Backups carry the three tables with no code, because `BackupDatabase.ReadShapes` reads the model.

## Backend steps

1. **Pure rules.** In `Common/SettleUp`:
   - `ShareAllocator.Allocate(total, method, parts)` returns one amount per member.
   - `SettleUpPlanner.Plan(balances)` returns the suggested payments for one currency.

   Unit-test them with theories: equal thirds of 100.00, weights 2 : 1 : 1, exact amounts that do not add up, one cent over three people, a zero weight, three debtors and two creditors, and balances that are already even.
2. **Filter.** The `IHouseholdScoped` branch in `AppDbContext`. Extend these tests:
   - `SharingLeakageTests`: a non-member (404), a removed member (404), and a deleted household (hidden until restored);
   - `ActiveHouseholdScopeTests`: a narrowing active household;
   - `QueryFilterTests`: the new branch.
3. **Service.** `ISettleUpService` and `SettleUpService` in `Endpoints/Households/Services`.
   - **Split** refuses:
     - an invisible transaction (`reference.notFound`);
     - one on an account the caller does not own (`settleUp.notPayer`);
     - one that is not an expense (`settleUp.notExpense`);
     - one already split (`settleUp.alreadySplit`, 409);
     - a member who is not in the household (`household.notMember`);
     - a split with nobody but the payer (`settleUp.noOtherMember`);
     - exact amounts that do not add up (`settleUp.sharesMismatch`).
   - **Update** is for the payer only (`access.forbidden`). It replaces the shares, and with `refreshFromTransaction` copies the transaction's current amount, date and description.
   - **Delete** is for the payer only and goes through `IDeletionRecorder`.
   - **Record payment** refuses:
     - a caller who is neither party (`access.forbidden`);
     - the same person twice (`settleUp.samePerson`);
     - a party who is neither a member nor holds an open balance (`household.notMember`).

     With a new transfer, it also refuses:
     - accounts that are not visible (`reference.notFound`);
     - accounts not owned by the right party (`settleUp.accountOwner`);
     - a currency other than the payment's (`settleUp.currencyMismatch`).

     Then it calls `ITransferService.CreateAsync` and saves the settlement in one database transaction. With `transferId` it makes the same checks, plus `settleUp.transferTaken` (409).
   - **Delete payment** is for either party and goes through `IDeletionRecorder`.
   - **Balances** loads the household's expenses, shares and payments in three queries. Payment rows whose transaction is soft-deleted are left out through `db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly)`: only the deleted flag is read, so nothing of a personal transaction reaches another member. It then sums per member and currency and calls `SettleUpPlanner`.
4. **Endpoints** under `HouseholdsGroup`:
   - `GET /api/households/{id}/settle-up`: the balances per member and currency, plus the suggested payments;
   - `GET /api/households/{id}/shared-expenses`: a paged list with payer, date, description, amount, method, shares, the caller's share and `counted`, plus `transactionId` and `amountDiffers` for the payer only;
   - `POST /api/households/{id}/shared-expenses` with `{ transactionId, method, shares: [{ userId, weight?, amount? }] }`;
   - `PUT /api/households/{id}/shared-expenses/{expenseId}` with `{ method, shares, refreshFromTransaction }`;
   - `DELETE /api/households/{id}/shared-expenses/{expenseId}`;
   - `GET /api/households/{id}/settlements`: a paged list;
   - `POST /api/households/{id}/settlements` with `{ fromUserId, toUserId, amount, currency, date, note?, transfer?: { fromAccountId, toAccountId }, transferId? }`;
   - `DELETE /api/households/{id}/settlements/{settlementId}`.
5. **Ledger.** `TransactionResponse` gains `SharedExpense?` (id, household id and name, and whether the amount differs), filled for the payer only, in the same batched query that fills `DebtPayment`.
6. **Trash.**
   - Add labels through `TrashLabel.Dated`.
   - Add restorers in `TrashRestorers`, with `FeatureOf` returning `Households`.
   - Restoring a split whose transaction is gone answers `restore.referenceMissing`. Restoring one whose transaction was split again since answers `settleUp.alreadySplit`.
7. **Audit.** `AuditCollector` takes the household of an `IHouseholdScoped` row from the row itself, and adds drafts and field diffs for both kinds. Shares are folded into their expense, as split lines are folded into a transaction.
8. **Error codes:** `settleUp.notPayer`, `settleUp.notExpense`, `settleUp.alreadySplit`, `settleUp.noOtherMember`, `settleUp.sharesMismatch`, `settleUp.samePerson`, `settleUp.accountOwner`, `settleUp.currencyMismatch` and `settleUp.transferTaken`.

## Frontend steps

1. `just gen`. In `invalidation.ts`:
   - splits refresh the settle-up and shared-expense roots and the transactions root;
   - a payment with a transfer also refreshes `ledger` and transfers;
   - the two deletes also refresh the trash.
2. **Row action.** "Split with household" in `transaction-row-actions.tsx`. It is offered on an expense on the caller's own account while the caller belongs to a household and `Households` is on. It opens `features/households/split-expense-dialog`:
   - a household select, defaulting to the active household;
   - the method as a segmented control;
   - one row per member with a checkbox and a weight or an amount;
   - an "each pays" preview from a small `share-allocation.ts` that mirrors `ShareAllocator` and is unit-tested with the same cases. The server stays the authority.
3. **Mark.** A `SharedExpenseMark` beside the debt mark in the ledger, with an `sr-only` sentence ("Split with Home, your share 30.00 EUR"). When the amount differs it says so, and offers "Update split".
4. **Household card.** `household-card.tsx` gains a Balances block with each member's balance in words, never by colour alone ("owes you", "you owe"). Each suggested payment has a "Record payment" button, and there is a "Show shared expenses" toggle like "Show activity", with a paged list of splits and payments.
5. **Payment dialog.** `features/households/settlement-dialog` has from, to, amount, currency, date and note. "Also record a transfer" offers two account selects filtered by `ownerId` and currency. Stories cover the default, no visible account for the other party, a server error and a `play` that records a payment.
6. **Member removal.** The remove confirmation in `member-row.tsx` shows the member's open balance from the settle-up query.
7. **Activity.** New sentences in `activity-sentences.ts`, in English and Lithuanian, for the two kinds.

## Tests

- **Unit:** `ShareAllocator` and `SettleUpPlanner` theories; `share-allocation.ts` with the same cases.
- **Integration:**
  - Splits: equal, shares and exact splits of a personal-account expense, where the partner sees the split but a `GET` of the transaction answers 404; a split on a housemate's shared-account row is refused; a second split of the same transaction answers 409.
  - Balances: deleting the transaction removes the split from the balances and restoring it brings it back; balances in two currencies stay apart; the suggestions settle three members in at most two payments.
  - Payments with a transfer: from own personal to the partner's shared account the transfer is created and visible to both; a personal target account answers `reference.notFound`; the wrong owner and the wrong currency are refused. Deleting the settlement keeps the transfer.
  - Membership: after removal the removed member gets 404, the others still see the balance and can record a payment with them.
  - Scope, trash and audit: an active household narrows the lists; a trash restore works in both directions; the audit rows appear per household with their descriptions.
  - Backup: a restore keeps the splits and the payments.
- **Stories:** the split dialog, the card's Balances block and the payment dialog, in the default, empty, pending and error states.

## Docs

- New `docs/features/household-settle-up.md`, and a row in `docs/features/README.md`. The page covers:
  - the three methods, with a worked example of cents;
  - the balance formula, and why reports do not change;
  - what other members can and cannot see of a personal payment.
- Updates to:
  - `docs/features/households-and-sharing.md`: a new "Settling up" section, and the "Only accounts, categories and tags can be shared" sentence;
  - `docs/architecture/sharing.md`: `IHouseholdScoped`;
  - `docs/decisions/households-and-sharing.md`: the entries above, dated;
  - `docs/features/audit-log.md`;
  - `docs/features/trash-and-undo.md`;
  - `docs/features/transactions.md`;
  - `docs/data-model.md`;
  - `docs/api.md`;
  - `docs/scope.md`;
  - `docs/backlog.md`.

## Open questions

- Should the "my share" view of reports, budgets and the dashboard be part of the first release? Without it, a member who pays for the household from a personal account sees the full amount as their own spending until they record the money they get back as a refund, and the member who owes sees none of it.
- Should open balances appear in net worth, as money owed to you and money you owe? v1 leaves them out, so net worth moves only when the payment is made.
