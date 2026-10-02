# Exports

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/exports.md), [architecture: Transactions, imports and receipts](../architecture/transactions.md).

```mermaid
flowchart TD
    Menu["ExportMenu with the current filters<br/>and the active household"] --> Kind{"Format"}
    Kind -->|"CSV"| Link["plain link GET /api/transactions/export"]
    Link --> Names["Account, category and tag names loaded once"]
    Names --> Stream["StreamExportAsync: async sequence, no tracking,<br/>row written as it arrives, no Content-Length"]
    Stream --> Guard["Text cell starting with = + - @ tab or CR gets a leading quote"]
    Kind -->|"PDF"| Fetch["mutation over fetchFile, blob saved with saveFile"]
    Fetch --> Cap{"More than App:PdfExportMaxRows (5000)?"}
    Cap -->|"yes"| Too["400 export.tooManyRows, shown as a toast"]
    Cap -->|"no"| Pdf["MigraDoc lays out the document in memory"]
```

These exports answer what the current screen shows. A member who wants everything they own, in one file and whatever the household scope, takes the [data export per user](data-export-per-user.md) from Settings › Personal › Import and export; its `transactions.csv` has the columns below and is written by the same `TransactionCsvWriter` (`Endpoints/Transactions/Shared`).

## The scope of an export

Every export answers the same scope as the screen it was started from. The filters of the screen are already in the URL, including "Unusual only" as `unusual=true` since 2026-09-26 and "Uncategorized" as `uncategorized=true` since 2026-09-27, which the two transaction exports honour through the same `Filtered` query as the list; neither export gained a column for them; since 2026-09-21 the active household is there too, as `activeHousehold`, written by `useExportUrl` from the same browser preference the API client reads for its `X-Active-Household` header. A CSV is a plain `<a href>` and a browser sends no header of its own with one, so without that parameter a CSV downloaded under a household scope held rows the screen did not show, and disagreed with the PDF of the same screen. Since 2026-09-29 the ledger's export links are built by the generated `getExportTransactionsUrl` and `getExportTransactionsPdfUrl` from the list's own parameters, so both files follow the list's sort as well as its filters; the `page` and `pageSize` they carry are ignored, and the reports page passes page 1 of size 1 only because the contract marks them required.

The parameter is not a second rule. `ActiveHouseholdMiddleware` reads it on the three export routes only and puts it through the membership check the header gets, so an id the caller is not a member of, an unparsable value and an empty one all mean "Everything" and nothing can widen a view. The PDF carries both, because it goes through the API client and its URL is built the same way; the two must agree, and a request naming two different households is refused with 400 `household.scopeMismatch`. The [households page](households-and-sharing.md) has the whole rule and the reason a household id is the one scope value allowed in a query string.

```mermaid
flowchart TD
    Screen["Screen under a household scope"] --> Csv["CSV: plain link,<br/>scope in activeHousehold"]
    Screen --> Pdf["PDF: fetchFile,<br/>scope in the header and the URL"]
    Csv --> Middleware["ActiveHouseholdMiddleware"]
    Pdf --> Middleware
    Middleware --> Same["the same rows the screen shows"]
```

## Columns

The CSV carries `Date,Description,Account,Category,Tags,Type,Amount,Currency,Note,Spread months,Place,Group`; `Note` and then `Spread months` (empty unless the row is [spread over months](transactions.md#spreading-over-months)) were added at the end on 2026-09-30, `Place` (the [place](transaction-locations.md#exports-and-backups) of the row, empty while the `Locations` switch is off) on 2026-10-01, and `Group` (the name of your own [group](transaction-groups.md) the row is in, empty for a row in no group or in a housemate's) the same day, so a spreadsheet reading the older columns by position keeps working. Coordinates are never exported to the CSV. The PDF prints the same columns except the currency, which travels with each amount, the note, the place, the group, and the spreading, which it prints as "Spread over 12 months" under the description, and it lays them out with fixed widths for the date, the type and the amount and relative widths for the rest. The `Tags` cell holds the tag names joined with "; " — a semicolon rather than a comma, so the cell needs no quoting in the common case — and it is empty for a transaction that carries none.

Tags are the one column whose names the streamed row does not carry, so the CSV export loads the tag map of the filtered set in one query before it starts writing. A join row is two uuids, so that map is far smaller than the ledger it describes, and the rows themselves are still streamed one at a time. The PDF is capped at `App:PdfExportMaxRows` anyway, so it loads the tags of its own result. Tags are described on [Tags](tags.md).

A [refund](transactions.md#refunds) is exported as it is stored: type `Expense` with a negative amount, so a spreadsheet sum of the Expense rows is net spending. The PDF's totals are net as well, its type cell reads "Refund" for such a row, and the amount keeps its minus sign.

## The yearly investment tax summary

Since 2026-09-21 there is a second CSV, `GET /api/investments/tax-summary/export?year&accountIds`, described on [Investments](investments.md). It writes its rows the same way — a `StreamWriter` over the response body, no `Content-Length`, the same leading-quote guard for a text cell that begins with `= + - @`, a tab or a carriage return — through the shared `Common/CsvCell` helper that the transaction export now also uses. Only text cells are guarded; a date, a number, a currency code or a section name is written as it is, so a negative amount keeps its minus sign.

It has no PDF. Printing that page under its print stylesheet replaces one, which keeps MigraDoc, and the row cap it needs, out of a report whose rows are already bounded by one year.

```mermaid
flowchart TD
    Ask["GET /api/investments/tax-summary/export"] --> Build["The year computed once:<br/>a first-in-first-out replay needs the whole history"]
    Build --> Write["Rows written to the response as they are produced"]
    Write --> Kind{"Section column"}
    Kind -->|"Disposal, Merger"| Sale["one row per sale,<br/>or per merger paid in cash"]
    Sale --> Lot["Lot: one row per lot that sale consumed,<br/>carrying its acquisition date"]
    Kind -->|"Dividend, Interest,<br/>WithholdingTax, Fee"| Cash["one row per cash entry"]
```

The columns are `Section,Date,Account,Security,Currency,Quantity,Amount,CostBasis,Gain,ReportingCurrency,ReportingAmount,ReportingCostBasis,ReportingGain,AcquiredOn,Description`. Each row carries the figure in the currency it was recorded in and again in the reporting currency at the frozen rate, which is why the currency appears twice. `Amount` is the proceeds of a disposal and the amount received or paid of a cash entry; withholding tax and fees are positive amounts paid. `Description` holds the security's full name on a `Disposal` row and the entry's note on a cash row. Since 2026-10-02 the cash part of a merger is a `Merger` row, laid out as a `Disposal` row. A `Lot` row repeats the date, account, security and currency of the disposal above it and fills only `Quantity`, `CostBasis`, `ReportingCostBasis` and `AcquiredOn`. There are no total rows: every row is a recorded entry, so a spreadsheet can sum a column without counting anything twice.
