# Transactions, saved filters and templates: decisions

Related: feature page [Transactions](../features/transactions.md); architecture [Transactions, imports and receipts](../architecture/transactions.md).

## Current

Both are per-browser, in their own TanStack DB local-storage collections; no table, no endpoint, no backup coverage. A saved filter is the filter half of the ledger search params under a name, applied through the router so the back button still works, and one that names a deleted category, account or tag is applied as stored and marked in the menu. A template is a transaction's shape without its date; Duplicate is the same thing taken from a row, with today's date. Both fill the ordinary create form and write nothing until it is submitted

A refund is an expense with a negative amount, the same signed number in the database and the API, so every expense total nets it and the checks that look for charges skip it with `Amount > 0`. It may name one visible purchase through `refundOfTransactionId`, is not capped at that purchase's amount, cannot be split, and "Record refund" fills the create form from the purchase with its own description. The ledger's type filter has no Refunds value.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** The open question of the refunds plan, decided while the owner was away and to be reviewed: the ledger's type filter gets no separate "Refunds" value; "Expense" lists refunds with their Refund tag
  - Rejected: A `refund` value of the type filter, served by an `Amount < 0` condition in `Filtered`
  - Why: It was the plan's recommendation and the conservative choice: no new filter value in the contract, the saved filters, the chips and the export links, and a refund is an expense by definition, so the expense filter showing it keeps the list and the expense total in agreement. A reader who wants only refunds can sort the expense list by amount
- **2026-09-29.** "Record refund" prefills the purchase's own description rather than "Refund: {description}"
  - Rejected: The plan's "Refund: {description}"; setting the refund's `PayeeKey` from the purchase regardless of its description
  - Why: `PayeeKey` is the normalized description, and "Refund: Maxima" normalizes to "refund maxima", so the plan's text would have put every refund recorded from the ledger under a payee of its own and left the shop's total in spending by payee unchanged, against the plan's own rule that a refund lowers its payee's total like its category's. Copying the key from the purchase would have been a second writer of the column for one case. The Refund tag and the "Refund of" link already say what the row is
- **2026-09-29.** A refund is an expense with a negative amount: `Transaction.Type` stays `Expense`, and `Amount` and `ReportingAmount` are negative
  - Rejected: A new `FlowType.Refund`; an `IsRefund` flag with a positive amount
  - Why: Every total already sums `ReportingAmount` over `Type == Expense`, so a negative amount nets out with no change: attributions, reports, dashboard, month close, budgets, the ledger summary, the PDF and the account balance. A new flow type would break the rule that a category's type equals the transaction's, and every `Type == Expense` filter would need `or Refund`. A flag would need a sign flip in each of those sums, and one missed sum silently inflates spending
- **2026-09-29.** The API carries the signed amount: `amount` is negative for a refund, income stays positive, responses carry the stored signed values
  - Rejected: A positive `amount` plus `isRefund`
  - Why: One number end to end. Responses and exports then agree with the database and with every total, with no second field to keep in step
- **2026-09-29.** A refund may name the purchase it refunds through an optional `RefundOfTransactionId`, one purchase per refund, checked when the refund is written
  - Rejected: A required link; a link table allowing one refund for several purchases; re-checking the link when the purchase is edited
  - Why: Many refunds come without a findable original, such as a price adjustment or a cashback, and one refund for one purchase is the common case. The link is a pointer for the reader, not a constraint any total depends on, so a later edit of the purchase need not be refused over it
- **2026-09-29.** A refund is not capped at the purchase's amount, and it cannot be split
  - Rejected: Refusing refunds whose total exceeds the purchase; split refunds with negative lines
  - Why: Shipping refunds, goodwill credits and currency differences exceed the purchase legitimately, and the "Refunded" mark shows the total, so a typo is visible. A split refund would need negative lines and a rule for mixed signs, while a returned item is one category almost always; the purchase can still be split

- **2026-09-20.** Saved ledger filters and transaction templates live in the browser, as two TanStack DB local-storage collections (`jx-saved-filters`, `jx-transaction-templates`) beside the `jx-preferences` row, with no table, no endpoint and no backup coverage
  - Rejected: A `SavedFilters` and a `TransactionTemplates` table as personal `OwnableEntity` records under their own routes; putting them inside the existing `jx-preferences` row
  - Why: The active-household decision taken earlier today drew the line in the right place: a thing that describes how one browser looks at the data is a browser preference, and a saved filter is literally a named query string of the screen it belongs to. A server table would have bought one thing, following the user to their phone, and paid for it with a migration, a CRUD slice, validators, invalidation entries, fixtures, backup and restore coverage and a rule for what a restore does with somebody else's saved views — for a record the product never reads. A template does hold money amounts, which is the reason to stop and think, but it holds them the way a half-typed form does: nothing sums it, no balance or report reads it, and losing it loses typing rather than data. The cost is stated plainly: a saved filter and a template do not follow the person to another browser, exactly like the theme and the active household. They are separate collections rather than fields on the preferences row because they are lists that grow, and one row per saved view is what makes rename and delete a single keyed write
- **2026-09-20.** A saved filter stores the filter half of the search params only — search, account, category, tags, type and the date range — and never the page number, the sort or the row selection
  - Rejected: Saving the whole search object, sort included; saving the selection with it
  - Why: The page number is one reading of one list and would reopen a saved filter on a page that may no longer exist. The sort is the reader's current question about the rows, not part of "which rows": restoring it would silently reorder the table under somebody who had just sorted it by amount, and the filter menu would become a second, hidden sort control. The selection is transient by construction — the page already clears it on any navigation, because a tick means "this row, in this view"
- **2026-09-20.** A saved filter that names a deleted category, account or tag is applied exactly as stored, and the menu entry says that it names something that no longer exists
  - Rejected: Dropping the missing part and applying the rest; hiding or disabling such an entry; deleting it
  - Why: Dropping the part silently answers a wider list than the name promises, which is the same objection that made an unparsable `tagIds` a 400 rather than an ignored value. Hiding the entry loses a name the owner can still read, rename and delete, and the state is not an error: a household that deleted a tag may well recreate it. Applied as stored, the ledger answers the empty list the filter honestly describes, and the note in the menu explains why
- **2026-09-20.** Duplicate and "start from a template" both fill the existing create form through one optional `prefill` draft and write nothing until submit; a template is saved from inside that same dialog rather than from a row
  - Rejected: A second create path that posts the copied values straight away; a "save as template" button per row; a separate template editor screen
  - Why: One `TransactionDraft` in, one form out, means the split-total rule, the positive-amount rule, the category-follows-type rule and the server field errors are written once and cannot drift. Posting on click would make a mis-click a real transaction in a ledger, which is the one thing an accidental duplicate must not be. Saving from the dialog composes with Duplicate — duplicate a row, then name it — so a row needs no fourth icon button, and a person can template a shape they have never saved. A separate editor would be a second form for the same fields with no validation of its own
