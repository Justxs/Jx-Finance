# Transactions

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/transactions.md), [architecture: Transactions, imports and receipts](../architecture/transactions.md), [architecture: Frontend data, loading and tables](../architecture/frontend-data.md).

Backend `Transactions`, page `/transactions`. One `Filtered` method builds the query for the list, the summary, the CSV and the PDF, so the four cannot disagree.

```mermaid
flowchart TD
    Url["Search params<br/>text, payee, account, category, tags, type, dateFrom, dateTo, unusual, uncategorized, sort, direction, page"] --> Defer["useDeferredParams"]
    Defer --> List["GET /api/transactions"]
    Defer --> Summary["GET /api/transactions/summary"]
    Url --> Csv["GET /api/transactions/export"]
    Url --> Pdf["GET /api/transactions/export/pdf"]
    List --> F["TransactionService.Filtered(TransactionFilterRequest)"]
    Summary --> F
    Csv --> F
    Pdf --> F
    F --> Vis["Visibility filter: own and household-shared accounts"]
    Vis --> Sql["SQL filter and sort, ILIKE with escaped pattern,<br/>one EXISTS per chosen tag"]
```

A transaction also carries tags, which are described on their own page: [Tags](tags.md). They are part of the create and update bodies as `tagIds`, they come back on every transaction response, `tagIds` is a comma-separated filter on the same four endpoints, and `POST /api/transactions/bulk-tags` sets the whole set on a selection. Tags sit on the transaction and never on a split line.

A transaction can also carry up to ten files — a receipt photo, an invoice PDF — added and removed from its edit dialog and counted with a paperclip in the ledger; every transaction response carries `attachmentCount`. They follow the transaction's visibility, stay with it in the trash, and are described on their own page: [Attachments](attachments.md).

Since 2026-09-26 an expense far above what its payee or its category usually costs carries a stored verdict, checked by a background job once when the row is recorded and again after an edit to its amount, account, category, type, date, description or split. Every transaction response carries `unusual` and `unusualDismissed`, the ledger shows a rising-arrow badge beside the paperclip whose popover explains the verdict and marks the row "Not unusual" with undo, and `unusual=true` is a filter on the same four endpoints, offered as "Unusual only" in the amount column's filter and in the phone filters dialog. All of it is behind the `UnusualAmounts` switch and described on its own page: [Unusual amounts](unusual-amounts.md).

Since 2026-09-27 an expense can pay one of the signed-in user's debts that track payments. Rows of `GET /api/transactions` carry `debtPayment` (the link id, the debt id and the debt name) only for the owner of the link; a housemate who sees the same row on a shared account gets null. The ledger shows a small debt mark beside the badges that opens the debt's page, and the row's actions menu offers "Link to debt" on an unlinked, unsplit expense when some debt tracks payments (a dialog with the debt, the kind and an optional principal from the statement) and "Unlink from debt" on a linked one. The row itself stays an ordinary expense everywhere. See [Debt amortization](debt-amortization.md#tracking-payments).

## Active filters and the header

While a column filter is active its button names the value in its tooltip and accessible name, such as "Filter by Account (now: Swedbank einamoji)", besides the tint. Above the rows, one line lists every active filter as a removable chip, labelled with its column, and ends with "Clear filters", which keeps the sort. A date range that covers exactly one calendar month reads as the month, such as "September 2026"; otherwise it reads as a range, or "From" or "Until" one date. The search text is quoted, the payee chip shows the key it filters on, and the category chip can read "Uncategorized". The phone filters dialog writes the same search params, so the line shows on phones too. It replaced the "Clear filters" button that sat in the page header. `useFilterSummaries` builds the chip texts, and the column buttons read the same texts.

While the `Import` switch is on, the header also holds "Import bank statement" beside "Add transaction"; it opens the dialog described in [Bank statement import](bank-statement-import.md).

In the transaction form, Type is an Expense / Income segmented control, and Category, like the category of each split line, is a searchable combobox.

When a filter leaves no rows, the empty table and the phone list say so and offer "Clear filters", which runs the same reset as the chip line. Without an account the page says so and links to the accounts page with the create dialog open. Below the rows, the pager shows the range and the total, such as "51–100 of 438", and from five pages on a page number field, where typing a number and Enter jumps to it, clamped to the last page.

## Changing one row's category

On the desktop table the category cell of an unsplit row is a borderless combobox, with the category icon beside it, listing the categories of the row's type plus "Uncategorized"; its popup opens with a search box, so a click, a few letters and Enter file the row. Choosing one posts `POST /api/transactions/bulk-category` with that single id, so the same rules as bulk recategorizing apply, and the cell shows the choice while the request runs. No success toast is shown, so a run of rows can be categorized one after another; a failure toasts as usual and the refetch puts the old value back. Split rows keep the "Split" tag, a row still being saved keeps plain text, and the phone list keeps the full dialog.

A save that sets or changes a category, in this cell or in the transaction form's create and edit, then asks whether the row completed a suggested rule. When it is the third row of one payee filed by hand under one category, a toast asks "Always categorize descriptions starting with "MAXIMA" as Groceries?" with **Create rule** and **Don't ask again**; it comes once, and only while categorization rules are switched on. See [Categorization rules](categorization-rules.md#suggested-rules).

## Uncategorized rows and closed months

`uncategorized=true` is a filter on the same four endpoints, part of `TransactionFilterRequest` like every other, and belongs to no feature. It keeps a transaction with no category, and a split transaction with at least one line without one; a split whose lines all carry a category is categorized even though its own `CategoryId` is empty. The ledger offers it as "Uncategorized", right after "All categories" in the category column's filter and in the phone filters dialog; choosing it clears `categoryId` and choosing a category clears it, so the two never combine. It is the `uncategorized` search param, counts as an active filter, travels in the export links and in a saved filter, and a saved filter written before it parses without it. It arrived with [month-end close](month-end-close.md), whose checklist counts the month's uncategorized rows through the summary and links to the ledger with the month's dates and this filter, so the count and the list it opens agree.

While `MonthClose` is on, the create and edit dialogs of a transaction and a currency conversion show a hint under the date when that date falls in a month the user closed under the current household scope: "August 2026 is closed. Saving will show as a change after the close." `ClosedMonthHint` in `features/month-close` reads the year's statuses from `GET /api/month-close?year=`, fetched quietly on demand with a one-minute stale time; a failure shows no hint. It is a hint only: saving is never blocked, and the change shows as drift when the dashboard shows that month. Every transaction, transfer, conversion and investment mutation also invalidates the `/api/month-close` queries, so the month's status and drift follow without a reload.

## Payee filter

`payee` is a filter on the same four endpoints, part of `TransactionFilterRequest`, and belongs to no feature. The server normalizes the value with `SubscriptionDescription.Normalize` and keeps the rows whose stored `PayeeKey` equals it, so a key from the report and a pasted description such as "MAXIMA LT, UAB 4412" find the same rows; a value with nothing left after normalizing filters nothing, and more than 500 characters is refused with `text.tooLong`. It is how a row of "Expense by payee" on the reports page opens the ledger, together with `type=expense` and the range, so the list, the totals and both exports agree with the report's amount; see [Reports](reports.md#expense-by-payee). Unlike `search`, which is `ILIKE` on the raw text, it ignores punctuation and reference numbers. The filters dialog has no field for it, because it is reached from the report: it is the `payee` search param, counts as an active filter, shows as a removable "Payee" chip, travels in the export links and in a saved filter, and a saved filter written before it parses without it.

## Create with a split

```mermaid
sequenceDiagram
    actor User
    participant Form as TransactionForm
    participant Client as customFetch
    participant Api as POST /api/transactions
    participant Rates as ExchangeRateService
    User->>Form: amount 12,50, currency, category or split lines
    Form->>Form: zod: lines must total the amount
    Form->>Client: optimistic row added to the cached list
    Client->>Client: decimal fields normalized to 12.50
    Client->>Api: request
    Api->>Api: account visible, category of the right type, currency usable
    Api->>Rates: rate for the transaction date
    Rates-->>Api: ReportingAmount frozen for that date
    Api->>Api: lines share ReportingAmount in proportion, last line takes the remainder
    Api-->>Client: 201
    Client->>Client: invalidate ledger roots: transactions, accounts, dashboard, reports, budgets, net worth
    Note over Form: failure keeps the dialog open with values,<br/>field errors land on their fields
```

While the split is on and the amount is a valid positive number, a line above the split lines reads "Transaction €75.00 · Assigned €52.00" followed by "€23.00 remaining", "€5.00 over" in the expense colour, or "Fully assigned". `splitBalance` in `line-form-value.ts` counts only line amounts that parse as money and works in cents. A line whose amount is empty offers "Use remaining €23.00", which types the remainder into it. The zod rule that the lines must total the amount is unchanged; the line only shows the gap before submit.

## Bulk recategorize and bulk tagging

```mermaid
flowchart TD
    Select["Tick rows, split rows cannot be ticked"] --> Same{"All selected rows of one type?"}
    Same -->|"no"| Disabled["toolbar disabled"]
    Same -->|"yes"| Post["POST /api/transactions/bulk-category"]
    Post --> Load["Load every id through the visibility filter"]
    Load -->|"any missing"| NF["404, nothing written"]
    Load -->|"any split"| Split["transaction.splitNotAllowed, nothing written"]
    Load --> Check["ValidateCategoryAsync once per type"]
    Check --> Save["one SaveChanges, all or nothing"]
```

`POST /api/categorization-rules/run` is the third way a category or a tag arrives on a row that already exists, and it plays by stricter rules than either bulk operation: it only offers rows that carry no category at all, unless the caller explicitly asks to recategorize, it never touches a split transaction, and it adds tags without removing any. See [Categorization rules](categorization-rules.md).

`POST /api/transactions/bulk-tags` is the same operation for tags and replaces the whole set on every listed row. It differs in two ways: it accepts split rows, because a tag belongs to the payment rather than to a line, and it does not care whether the selection mixes income and expense, because a tag has no flow type. It is all or nothing in the same way: an invisible transaction answers 404, an invisible tag answers 400 `reference.notFound`, and nothing is written in either case.

## Saved filters

A saved filter is a name put on the filter half of the search params. It lives in the browser, in the `jx-saved-filters` TanStack DB local-storage collection, next to the preferences row; there is no table, no endpoint and nothing to invalidate. The menu sits in the page header beside the export menu, holds the whole list, and saves, renames, deletes and applies.

```mermaid
flowchart TD
    Url["Search params on /transactions"] --> Part["transactionFilterParams:<br/>search, account, category, tags, type, dateFrom, dateTo, unusual, uncategorized"]
    Part --> Save["Save filter under a name"]
    Save --> Store[("jx-saved-filters<br/>one row per filter: id, name, filter")]
    Store --> List["Saved filters menu"]
    List --> Apply["applyFilter"]
    Apply --> Nav["navigate: replace the filter,<br/>page back to 1, keep sort and direction"]
    Nav --> Url
    Store --> Check{"Does it name an account,<br/>category or tag that is gone?"}
    Check -->|"yes"| Mark["entry is marked as naming something gone,<br/>and still applies exactly as stored"]
    Check -->|"no"| Plain["entry shows its name alone"]
```

The page number and the row selection are never saved: the page number belongs to one reading of one list, and the selection is cleared by any navigation. Sorting is not saved either, so applying a saved filter never reorders the table under the reader; the sort the reader chose stays where it was.

Applying goes through `navigate` exactly as every filter control does, so the URL is the only state, the back button undoes an applied filter, and the link is still shareable. A name that points at a deleted category, account or tag is applied as stored rather than repaired: dropping the missing part would silently answer a wider list than the name promises, which is the one failure a filter must not have. The entry says so in the menu, and the ledger answers the empty list that the filter honestly describes.

## Templates and duplicate

```mermaid
flowchart TD
    Row["A row in the ledger"] --> Dup["Duplicate"]
    Dup --> Draft["TransactionDraft: account, category, amount,<br/>currency, description, tags, split lines; no date"]
    Tpl[("jx-transaction-templates<br/>one row per template: id, name, values")] --> Draft
    Draft --> Form["The create form, prefilled;<br/>the missing date falls back to today"]
    Form --> Valid["Same zod schema: positive amount,<br/>lines must total the amount"]
    Valid --> Post["POST /api/transactions, only on submit"]
    Form --> Name["Save as template: name the shape in the form"]
    Name --> Tpl
```

Duplicate is one action on a row. It opens the ordinary create dialog filled from that row, with today's date, its tags ticked and its split lines copied, and it writes nothing until the form is submitted; the split lines arrive without their server ids, because they will be new lines of a new transaction.

A template stores the same shape under a name, minus the date, in `jx-transaction-templates`. It is saved from inside the create dialog, so a template can be composed from nothing or, with Duplicate first, from an existing row. The amount is normalized before it is stored, so a comma typed in the form becomes the canonical `12.50`.

Both paths reach the server through the create form and its schema, not through a second writer: a template whose amount was left empty opens a form that refuses to submit until an amount is typed, exactly like a blank one.
