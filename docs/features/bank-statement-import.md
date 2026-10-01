# Bank statement import

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/swedbank-csv-import.md), [architecture: Transactions, imports and receipts](../architecture/transactions.md).

Backend `Imports` (`ImportPreviewService` for inspect and preview, `ImportConfirmService` for confirm, sharing `ImportQueries`, `CsvMappingService`, parsers in `Endpoints/Imports/Parsing` behind `StatementReader`, and the [import inbox](#import-inbox)), frontend `imports` (`ImportDataSection`, `ImportDialog`, `ImportProviders`, `ImportInboxList`, `ImportSection`, `CsvMappingForm`, `ImportStatementBar`). No route of its own. The dialog opens from three places, all shown to every user while the `Import` switch is on: the "Import bank statement" button beside "Add transaction" in the ledger header, the same entry in an account's row actions on the Accounts page, which preselects that account, and the Import data panel of the Import and export section under Personal on the one Settings page (`/profile?section=import`), whose other panel is the [data export per user](data-export-per-user.md).

The dialog lists the providers, and each one is a statement format:

| Provider | `format` | File | Limit |
| --- | --- | --- | --- |
| Swedbank | `swedbankCsv` | Swedbank account statement exported as CSV | 5 MB |
| Bank statement XML (ISO 20022) | `camt053` | camt.053 "bank to customer statement" from any bank that offers it | 20 MB |
| Each saved CSV mapping, by name ("Your CSV mapping") | `genericCsv` with its `mappingId` | That bank's CSV export | 5 MB |
| Other bank (CSV) | `genericCsv`, after a mapping is saved | A CSV export from any bank, card issuer or payment app | 5 MB |

The format is chosen from the list, never sniffed from the file. A file that does not match the chosen format answers `import.invalidFile` with a message naming the expected format. Every format goes through one preview and one confirm: `POST /api/import/preview` (multipart `file`, `accountId`, `format` and, for `genericCsv`, `mappingId`) and `POST /api/import/confirm` (JSON with `format` and `mappingId`, which the audit row names).

## Swedbank CSV

`SwedbankCsvParser` reads the export strictly: the nine columns in order ("Sąskaitos Nr.", type, "Data", "Gavėjas", "Paaiškinimai", "Suma", "Valiuta", "D/K", "Įrašo Nr."), only type `20` rows, `D` or `K` for the direction, the row's own currency, "Įrašo Nr." as the import reference and at most 10,000 rows. Any row that breaks a rule fails the whole file.

## camt.053 XML

`Camt053Parser` accepts a `Document` whose namespace starts `urn:iso:std:iso:20022:tech:xsd:camt.053.001.` and reads its elements in that namespace, so versions `001.02` to `001.13` all work. There is no XSD validation: banks deviate from the schemas in small ways, so an entry that cannot be read is counted ("1 entry could not be read") instead of failing the file. The document is loaded with the settings the Interactive Brokers Flex parser uses, through `SafeXml`: DTDs are refused, nothing external is resolved and the document is capped at 100 million characters.

| Element | Use |
| --- | --- |
| `BkToCstmrStmt/Stmt` | One per account and period; a file can hold several, and every one for the chosen account is read, with the latest closing balance |
| `Stmt/Acct/Id/IBAN` | Account match and warning |
| `Stmt/Bal` with `Tp/CdOrPrtry/Cd` = `CLBD` | Closing booked balance and its date, for the balance check |
| `Ntry/Amt/@Ccy`, `Ntry/CdtDbtInd` (`CRDT`/`DBIT`) | Amount, currency and direction |
| `Ntry/Sts` (or `Sts/Cd` from 001.08) | Only `BOOK` is imported; `PDNG` and `INFO` are counted and skipped |
| `Ntry/BookgDt/Dt` or `DtTm`, else `ValDt` | Date. A `DtTm` is converted to the installation time zone; one without an offset is already local and keeps its date |
| `Ntry/RvslInd` | Shown as a "Reversal" chip; the direction still comes from `CdtDbtInd`, and an incoming reversal starts as a [refund](#refunds) |
| `TxDtls/Refs/AcctSvcrRef`, `Ntry/AcctSvcrRef`, `Ntry/NtryRef`, `TxDtls/Refs/EndToEndId` | Import reference, see below |
| `TxDtls/RltdPties/Cdtr` or `Dbtr` (`Nm`, or `Pty/Nm` from 001.08) | Payee: the creditor for a debit, the debtor for a credit |
| `TxDtls/RltdPties/CdtrAcct` or `DbtrAcct` `/Id/IBAN` | Counterparty IBAN for transfer detection |
| `TxDtls/RmtInf/Ustrd` (joined), else `RmtInf/Strd/CdtrRefInf/Ref`, else `AddtlTxInf`, else `Ntry/AddtlNtryInf` | Description, clipped to 500 characters |

**Several statements.** A file with one statement is read whatever its IBAN. With several, the one whose IBAN equals the chosen account's is read; when none does, the preview answers `import.noStatementForAccount` and the message lists the IBANs the file holds.

**Batch entries.** An entry with several `TxDtls` whose amounts (`TxDtls/Amt`, or `AmtDtls/TxAmt/Amt` in older versions) add up to the entry's amount becomes one row per detail, because banks book card batches and salary runs as one entry and the details are what gets categorised. When they do not add up, the entry stays one row with the entry's own text and no payee.

**Import reference.** The first of these that is present and not `NOTPROVIDED`:

1. the detail's `AcctSvcrRef`;
2. the entry's `AcctSvcrRef`, plus `/` and the detail's index when the entry was split;
3. the entry's `NtryRef`, with the same suffix;
4. the detail's `EndToEndId`.

A value over 64 characters, or no value at all, becomes `h:` plus the base64url SHA-256 of the date, amount, direction, counterparty IBAN, description and split suffix, which is the same for the same entry every time. A reference that repeats inside one file, such as two identical card payments on one day or a batch whose details share the bank's reference, is hashed again with its occurrence number, so each real entry keeps its own stable reference. The hash and the occurrence rule live in `ImportReferences` (`Hash`, `Disambiguate`), which the generic CSV parser shares. References are stored without a format prefix, so if a bank uses the same id in its CSV and its XML, a user switching formats has the overlap flagged as duplicates instead of imported twice.

## OFX and MT940

Since 2026-09-30 the provider list also offers "OFX or QFX file" (`format=ofx`) and "MT940 statement" (`format=mt940`), for banks and card issuers that export neither camt.053 nor a CSV the dialog knows. Both are read by small parsers in `Endpoints/Imports/Parsing` and feed the same review, duplicate detection, suggestions, transfer matching, refunds and hand-entered matches as the other formats. `StatementText.Read` decodes the file as strict UTF-8 and falls back to Windows-1257, the Baltic code page older bank exports use.

**OFX.** `OfxParser` reads the older SGML files, whose tags need no closing tag, and OFX 2 XML the same way, from the `<OFX>` element on. Each `STMTTRN` becomes a row: `DTPOSTED` (or `DTUSER`) the date, the sign of `TRNAMT` the direction, `NAME` or `PAYEE/NAME` the payee, `MEMO` (or the payee) the description, `FITID` the reference, hashed when longer than 64 characters and told apart when a file repeats it. The currency is the statement's `CURDEF`, the account's when there is none. `BANKACCTFROM/ACCTID` counts as the account's IBAN when it looks like one, so a file from another account is caught like a camt.053; a card statement (`CCSTMTRS`) has none. `LEDGERBAL` is the closing balance, compared with the ledger and kept as a reconciliation on confirm.

**MT940.** `Mt940Parser` reads the tagged text lines, joining continuation lines to their tag. Each `:61:` is a row: its date, `C` or `RD` for money in and `D` or `RC` for money out, an `R` marking a reversal, and the amount with a decimal comma. The `:86:` after it gives the details: German-style subfields (`?20`–`?29` the purpose, `?32`–`?33` the name, `?31` an IBAN) when it has them, otherwise its lines joined as the description. MT940 has no reference that banks fill reliably, so every row's reference is a hash of its date, amount, mark, the first real reference of the line (`NONREF` skipped), the counterparty and the description, which is the same every time the file is read. `:25:` gives the account, a trailing currency code removed, `:60F:` the currency and the last `:62F:` or `:62M:` the closing balance.

## Generic CSV

Since 2026-09-29, "Other bank (CSV)", last in the provider list, reads a CSV export from any bank, card issuer or payment app through a column mapping the user saves once. A mapping (`CsvImportMapping`, see [Data model](../data-model.md#csv-import-mappings)) is personal, like a categorization rule.

**Mapping a file.** Choose "Other bank (CSV)", the account and the file, then Preview. Instead of a preview, `POST /api/import/csv/inspect` reads the file with `CsvInspector` and proposes how to read it:

- the encoding: a byte-order mark decides UTF-8 or UTF-16; without one, UTF-8 when the bytes are valid UTF-8, otherwise Windows-1257, so an older Baltic export does not arrive with "Ä¯raÅ¡o" for "Įrašo";
- the delimiter: of comma, semicolon, tab and pipe, the one whose most common cell count over the first 50 lines covers the most lines. The lines are split by the CSV parser, so a comma inside quotes does not count;
- the header line: the first line with that most common cell count, when it is at most 20 lines down. Blank lines are not counted, here or in `SkipLines`;
- whether there is a header at all: since 2026-10-01, when a cell of that line reads as a date in one of the formats below, the line is taken as the first entry and the file as having no header row (`noHeaderRow`).

It answers the header, or for a file without one the column positions `1`, `2` and so on with the first line as the first sample, up to ten sample rows of raw cells and, per column, the date formats that read every sample that looks like a date (when more than half of them do, so a "Total" line does not hide the date column) and, for a column of numbers, the decimal mark: a comma when a sample ends in a comma and two digits.

The mapping form (`CsvMappingForm`) then asks, top to bottom:

- the name shown in the provider list;
- the encoding, delimiter and lines above the header, and "The file has no header row", which read the file again and start the form over when changed. Without a header row every column is offered and shown as "Column 1", "Column 2" and so on, the mapping stores the positions, and the lines above count up to the first entry. Ticking or clearing it drops the columns already chosen, because a header name and a position do not translate;
- the amount style, a segmented choice with a one-line example under it, the amount, debit, credit or direction columns and the value that means money out, the decimal mark and an optional fee column;
- the date column and its format, the formats that read this file first and, when more than one does, a hint to choose the bank's;
- the optional description, payee, reference, balance, currency and status columns, a fixed currency when there is no currency column, and the booked values when there is a status column.

The lines above the header offer 0 to the generated `createCsvMappingBodySkipLinesMax` (20), and the form's rules are `mappingSchema` in `csv-mapping.ts`, next to the helpers that fill and send it. The section keeps the inspected file in its own state instead of reading the inspect mutation's data, because a new inspect clears that data while it runs: reading it directly would unmount the form on every change of encoding, delimiter or header lines and after a failed re-read. Each column select lists the header names with the first two sample values. The form starts on the first date column and the first number column, and the first five rows of the file show under it. "Save and preview" saves the mapping and previews the same file with it. When every column a saved mapping names is in this header, and the mapping reads a header row exactly when this inspection did, `matchingMappingIds` names it and the form offers "Use Revolut" above the fields.

**Saved mappings.** Each saved mapping is a provider between camt.053 and "Other bank (CSV)", so the bank's next file goes straight to the review. Its row has Edit, which opens the form with only the column names the mapping already uses because no file is chosen, and Delete, which goes to the [trash](trash-and-undo.md) with an undo toast. When a later file lacks a column the mapping names, the preview answers `import.missingColumns` naming them and offers "Update the mapping from this file", which opens the form over the saved mapping with that file's columns and samples. Editing a mapping without a reference column says in its hint that rows get new references when the description, payee or balance column changes.

**Reading rows.** `GenericCsvParser` reads the rows below the header, at most 10,000:

| Rule | How |
| --- | --- |
| Columns | By header name, trimmed and compared exactly; a named column missing from the header answers `import.missingColumns`. A mapping with `noHeaderRow` names positions from 1 instead, reads the first line after the skipped ones as an entry, and a position past that line's last cell answers `import.missingColumns` |
| Amount style | `signedNegativeIsExpense` (one signed column, minus is money out), `signedPositiveIsExpense` (card statements: plus is a purchase, minus a payment or refund), `debitCredit` (the filled column wins; a zero counts as empty, both filled is unreadable) and `amountWithDirection` (money out when the direction cell equals `expenseValue`, ignoring case) |
| Fee | The absolute value of the fee column is taken off the signed amount, so Revolut's −10.00 with a fee of 0.50 imports as a 10.50 expense |
| Status | With a status column, only rows whose status is one of the comma-separated `bookedValues` (ignoring case) are read; the others count in `notBooked` |
| Numbers | Spaces, no-break spaces, apostrophes, currency signs, letters and the other mark are dropped; a minus before the number, a trailing minus or parentheses make it negative; more than two decimals is unreadable |
| Dates | The text before the first space or `T` is read with the mapping's format, one of `yyyy-MM-dd`, `dd.MM.yyyy`, `dd/MM/yyyy`, `MM/dd/yyyy`, `dd-MM-yyyy`, `yyyy.MM.dd`, `yyyy/MM/dd` and `d.M.yyyy` |
| Currency | The currency column, else the mapping's fixed currency, else the account's; a currency that is not a code is unreadable |
| Description | The description column clipped to 500 characters, else the payee |
| Reference | The reference cell when it is not empty and at most 64 characters, stored unprefixed like camt.053 references. Otherwise `h:` plus the hash of the raw date cell, the signed amount, the currency, the description, the payee and the raw balance cell; a repeat inside the file is told apart by `ImportReferences.Disambiguate` |
| Skipped | A row whose date, number or currency cannot be read counts in `unreadable`, so a card statement's total line does not fail the file; a row whose amount is zero after the fee counts in `notBooked`. A file with neither a row nor a filtered one answers `import.invalidFile` |
| Closing balance | With a balance column, the balance of the row with the latest date, the first row when the file is newest first and the last otherwise, in that row's currency; a card statement's balance is negated, because a positive one is money owed |

The raw date cell keeps Revolut's time of day and the balance cell tells two equal coffees apart, so the hash of a row stays the same when an overlapping export is imported next month, and the overlap is flagged as duplicates. The hash does not include the mapping, so recreating a deleted mapping does not import everything again.

**Credit cards.** A card is an account of type Other whose starting balance is the debt as a negative number. Its mapping uses the "Card statement" amount style, so a purchase is an expense and a payment or refund money in, and paying the card from the current account is a transfer matched on both imports as usual. There is no card account type; see the [decisions](../decisions/swedbank-csv-import.md).

## Review

The review is the same for every format. The preview fills each row in twice over. Your [categorization rules](categorization-rules.md) run first: the first rule that matches a row's description, amount and flow type puts its category and its tags on the row and names itself in `matchedRuleName`, which the screen shows as a "Filled by a rule" mark with the rule's name in its tooltip. Where no rule gives a category and the `LearnedCategories` switch is on, a model trained on the categories you already chose may guess one: the preview answers `learnedCategoryId` and `learnedConfidence`, and the screen fills the category with a "Learned" mark whose tooltip reads "From your history, 93% sure"; see [Learned categories](learned-categories.md#in-the-import-review). Where neither has an opinion, the older recall still guesses a category from the most recent transaction with the same description, marked "Suggested category" as before. The order is therefore rule, learned, recall. A duplicate row gets none of them, because it cannot be imported. All are suggestions: the per-row category select, the per-row tag picker and the "set category for selected" action all replace them, the mark disappears, and the confirm request carries whatever the user decided — including `tagIds`, which `ImportConfirmService` writes as `TransactionTags` beside the new transaction in the same database transaction.

Since 2026-09-26, while the `UnusualAmounts` switch is on, the preview also judges each expense row the way the background check will once it is stored: `IUnusualAmountService.EvaluateAsync` runs once over all the expense rows, valued at the rate for each row's date, against the same payee on the target account or, failing that, the category a rule suggested. A row far above its usual amount answers `unusual` and shows an "Unusual amount" mark with the sentence, such as "3.1× the usual €41.50 for this payee", in its tooltip; a duplicate row never shows it. It is information only and is not sent back: confirmed rows arrive unchecked and the job evaluates them, so the stored flag has one source. See [Unusual amounts](unusual-amounts.md).

A row looks like a transfer when its payee or description holds a transfer keyword, or when its counterparty IBAN is the IBAN of another account you can see. In the second case `suggestedTransferAccountId` names that account and the row's "Record as" picker starts on it; the row still starts unselected, like every suspected transfer, and nothing is recorded until the user selects it.

The preview also answers `statement`, which the statement bar above the rows shows for a camt.053 file or a mapped CSV:

- the statement's IBAN, and when it is not the IBAN recorded for the chosen account, a warning. When the IBAN belongs to another account you can see, `otherAccountId` names it and "Switch to …" re-runs the preview for that account with the same file. A user who has recorded no IBANs can still import.
- how many pending or informational entries were skipped and how many entries could not be read. For a mapped CSV the first count reads "rows left out by the status filter or with a zero amount".
- the closing balance next to the ledger. `ledgerBalanceAtClose` is the account's balance on the closing date — starting balance plus every movement in the account's currency up to that date — and is filled only when the account's currency is the statement's, through `AccountMovements.LedgerBalanceOnAsync`, the call the [Reconcile dialog](reconciliation.md) uses. The bar adds the selected rows to it and says in words whether the result matches the closing balance or by how much it differs.

The closing balance is kept after the import. Confirm sends it back as `statement` (`closingDate`, `closingBalance`, `closingCurrency`, as the preview answered them), and when the format is `camt053` or `genericCsv` and the currency is the account's, `ConfirmAsync` records it as a `statement` [reconciliation](reconciliation.md#from-a-camt053-import) of the account after the rows are written, inside the same transaction and account lock, replacing one on the same date. It is recorded whether or not it matches. `reconciliation` in the response carries it with its difference from the ledger, and the result line and the toast say "Balance matches the statement on …" or "The statement differs by … on …". A Swedbank CSV, or a mapped CSV without a balance column, has no closing balance, and a statement in another currency records nothing. The month-close checklist then reads the account as reconciled or differing for the month instead of judging it by the date of its latest imported row.

```mermaid
sequenceDiagram
    actor User
    participant Dlg as ImportDialog
    participant Api as Import services
    participant Db as PostgreSQL
    User->>Dlg: choose a provider, target account, file
    Dlg->>Api: POST /api/import/preview with format
    Api->>Api: SwedbankCsvParser, Camt053Parser or GenericCsvParser with the saved mapping:<br/>rows, IBAN, closing balance, skipped counts
    Api->>Api: categorization rules: first match per row, by description, amount and type
    Api->>Db: while LearnedCategories is on: one query for the training rows,<br/>a learned guess for rows no rule filled
    Api->>Db: existing references: transactions incl. deleted, TransferImport receipts
    Api->>Db: while UnusualAmounts is on: one history query for the expense rows,<br/>judged against their payee or the rule's category
    Api->>Db: accounts with IBANs, ledger balance on the closing date
    Api->>Db: hand-entered transactions without a reference, within three days of the rows
    Api-->>Dlg: rows with isDuplicate, looksLikeTransfer, suggestedTransferAccountId,<br/>isReversal, suggestedCategoryId, suggestedTagIds, matchedRuleName, learnedCategoryId,<br/>learnedConfidence, unusual, matchedTransaction; statement summary
    Dlg->>Dlg: duplicates never selected, suspected transfers start unselected,<br/>rows matching your own entry start selected and linked
    Dlg->>Dlg: where no rule matched, the learned guess, then the category recall:<br/>exact description and type among the latest 200
    User->>Dlg: per row: income or expense with category and tags,<br/>new transfer with another account,<br/>match an existing transfer, or link your own entry
    Dlg->>Api: POST /api/import/confirm with format, selected rows only,<br/>and the closing balance as statement
    Api->>Db: begin transaction, advisory lock on the account id
    Api->>Api: matching verifies date, amount and direction
    alt transfer already holds a receipt for this account
        Api-->>Dlg: import.transferAlreadyMatched, nothing written
    else ok
        Api->>Db: transactions, transfers, TransferImport receipts,<br/>references on linked entries, one audit row naming the format
        Api->>Db: camt.053 or mapped CSV with statement in the account's currency:<br/>the closing balance as a reconciliation
        Api-->>Dlg: result, link to the imported rows, the reconciliation's difference
    end
```

Confirm reads everything the rows can need before it walks them: the references already imported, the tags and categories they name, the currencies of the accounts they transfer to, the transfers they claim to match and the receipts those transfers already carry, and the exchange-rate history covering the dates it has to convert. The loop then adds rows without asking the database again, so a file of ten thousand entries costs a fixed number of queries instead of one per row. `ITransferAmountResolver.Resolve` is the synchronous half of the resolver, taking the two account currencies the caller already knows.

Every confirmed row goes through the paths the manual forms use. A transaction row is valued by `ITransactionValuation`, so a row whose currency is switched off answers `currency.disabled`. A new transfer row goes through `ITransferAmountResolver`, the resolver of `POST /api/transfers`: the bank entry fixes the amount on the imported side, the other side is taken in its account's currency, and when the two differ the row answers `transfer.receivedAmountRequired`, because a statement line carries only one of the two amounts. Such a transfer is recorded under Transfers and the bank entry matched to it. Like every other confirm error, nothing of that request is written.

## The statement's payee

Every parser reads the counterparty's name apart from the text: camt.053 `Cdtr` or `Dbtr` `Nm`, the Swedbank "Gavėjas" column, a mapped CSV's payee column, OFX `NAME` or `PAYEE/NAME` and MT940 `?32`–`?33`. The preview answers it as `payee`, trimmed and clipped to 200 characters (`TransactionPayee.Clip`), the review shows it before the description, and since 2026-10-01 confirm sends it back and `ImportConfirmService` stores it on the new transaction as `Transaction.Payee`. A row linked to your own entry keeps your entry as it was, payee included, and a transfer has no payee.

The payee key then comes from the payee first: `SubscriptionDescription.KeyOf(payee, description)` is the normalized payee when anything is left of it, otherwise the normalized description. So "MAXIMA LT, UAB" keys every card line of that shop the same, however the bank words the purchase text. The preview computes the same key for the statement rows it judges for unusual amounts and passes the payee to the learned-category guess, so a row is judged by the key it will be stored under. Rows stored before the change have no payee and keep their description key; nothing re-keys them, so for a while a payee's earlier rows and its new ones are two keys in the payee report, the unusual-amount history and subscription detection, until the new key has its own history. The [payee name](payee-names.md) row action names the new key from the payee.

In the ledger the payee is the row's name when the member has not named it: the desktop description cell shows the payee with the bank's description in a muted line under it, the phone list and the dashboard's recent transactions read it before the description, and the search matches it. The edit dialog shows "Payee on the bank statement: …" under the description and cannot change it. The member's [journal download](data-export-per-user.md#double-entry-journal) uses it as the Beancount payee when the member has no name for the key. The CSV and PDF exports keep the description, as before.

## Entries you already made by hand

Since 2026-09-28 the preview also looks for a transaction you entered yourself before the statement arrived, such as a card payment typed in on the day. `ManualEntryMatcher` (`Endpoints/Imports/Matching`) is a pure function. A row that is not a duplicate matches a transaction on the same account when the transaction:

- was entered by hand or, since 2026-10-01, recorded through a [personal API token](personal-api-tokens.md#writing-with-a-token) (`Source` manual or api, anything but imported) and has no import reference;
- moves the same money in or out of the account in the same currency: an expense matches an outgoing row of its amount, and an income or a [refund](transactions.md#refunds) entered by hand matches an incoming row of its size;
- is dated at most three days before or after the bank entry.

Each transaction goes to one row at most. All pairs are ranked by the number of days between them, then by row order, so two equal payments on different days each find the closest one. The preview reads the candidates with one query over the statement's date range widened by three days, and answers the transaction's id, date, description and category as `matchedTransaction`.

In the review such a row starts selected and linked, even when it looks like a transfer. It shows "Matches your entry" with the date and description of your entry in the tooltip. Its "Record as" picker starts on "Your entry of 16 Sep", and choosing "Income / expense" or a transfer instead imports it the ordinary way. A linked row shows your entry's category and cannot take a category or tags from the review: it is not in Needs attention and "Set category for selected" skips it. The statement bar does not add it to the ledger balance, because your entry is already counted there.

A refund typed in at the till is offered as the bank's credit the same way, so it is not imported a second time as income; the review shows your entry's expense category on the linked row.

Confirm sends `existingTransactionId`. Instead of adding a transaction, the import writes the bank's reference onto yours and marks it imported, and nothing else about it changes: its date, category, tags, splits, description and attachments stay as you entered them. The confirm checks the same rule again under the account lock and answers `import.entryMismatch` when the transaction is gone, belongs to another account, already carries a reference, no longer fits or is named by two rows; as with every confirm error, nothing is written. The response counts `linked` beside `imported` and `skippedDuplicates`, and the household log's summary row names them. Because the reference is now stored, the same statement line is a duplicate on the next import. A linked row counts toward the month-close import coverage, and a link to a row dated in a closed month shows as an edit in its drift.

## Refunds

Since 2026-09-29 an incoming bank row can be recorded as a [refund](transactions.md#refunds): money back into an expense category instead of income. The row's "Record as" picker offers "Refund" for every incoming row, and "Refund of {date} {description}" when the preview found a purchase it probably refunds. Choosing either switches the row's category list to the expense categories and adds a "Refund" mark to its flags; the linked choice also takes the purchase's category. Going back to "Income / expense" or a transfer clears the category, because an expense category does not fit income.

The preview answers `refundCandidate` (`id`, `date`, `description`, `categoryId`, the shape of `matchedTransaction`) on an incoming row that is neither a duplicate nor matched to your own entry, when the account has an expense that:

- is not itself a refund and is in the row's currency;
- is dated on the row's date or at most 90 days before (`RefundOriginal.CandidateLookBackDays`);
- has a stored `PayeeKey` equal to the `SubscriptionDescription.Normalize` key of the row's payee or of its description;
- is at least the row's amount.

Of those the most recent wins. One query reads the account's purchases from 90 days before the earliest row to the latest one, grouped by key in memory.

The review starts a row as a refund, selected, when it carries a candidate or is a camt.053 reversal, unless it is a duplicate, matches your own entry or names another of your accounts by IBAN. A candidate's category is filled in, the rule and recall suggestions are dropped, and the row starts without tags. The selection summary and the statement bar are unchanged, because the bank's amount and direction are what moved.

Confirm sends `asRefund` and, for the linked choice, `refundOfTransactionId`; `type` and `amount` stay the bank's. `ImportConfirmService` writes the row as an `Expense` with the negated amount, valued the usual way, in the chosen category, which must be an expense category (`category.wrongType`). The purchase is checked by `RefundOriginal`, the helper the transaction form's save uses: a visible expense that is not a refund, or `transaction.refundOriginalInvalid`. `asRefund` on an outgoing row, a transfer or a linked row, and `refundOfTransactionId` without `asRefund`, answer `import.refundInvalid`. As with every confirm error, nothing is written.

## Views, search and leaving a review

The rows sit under a switch of four counted views: All, Needs attention, Transfers and Duplicates. Needs attention holds the selected rows that are not recorded as a transfer or linked to your own entry and have no category, which would otherwise enter the ledger uncategorized. Transfers holds suspected transfers and rows recorded as one, and Duplicates the rows already imported. A search box narrows any view to rows whose description or payee contains the text, ignoring case.

Views and search only decide which rows are shown. A hidden row keeps its selection, category and tags, and the selected count, the net, the statement balance check and the Import button always count every row. The header checkbox selects or clears only the rows the view and search show, while "Set category for selected" still applies to every selected row. Changing the view or the search returns the list to its first page, and neither is remembered.

Everything decided in the review lives in the dialog until it is imported. Once a row has been changed (selected or cleared, given a category, tags or a transfer), every action that would throw the review away asks first: closing the dialog by Escape, a click outside or the close button, going back to All providers, Cancel, choosing another account, Preview and "Switch to" on the statement bar. Choosing another file does not clear the review by itself; the new file replaces it only when Preview runs. An untouched preview is discarded without asking.

## Import inbox

Since 2026-10-01 a statement can also arrive without the dialog: the API watches a folder, and each statement file dropped there by a bank's scheduled export or a sync client becomes a review waiting for the owner of the account it names. Nothing is fetched from outside and nothing is imported until the owner reviews it. The pieces are `ImportInboxJob` (`Infrastructure/BackgroundJobs`), `ImportInboxFolder` (`Infrastructure/Imports`), `ImportInboxReceiver` and `ImportInboxService` (`Endpoints/Imports/Services`), the pure `InboxRules` (`Endpoints/Imports/Inbox`) and, on the client, `ImportInboxList` in the provider step of the dialog and `ImportInboxSection` under Settings › Installation.

**Turning it on.** The folder is `App:ImportInbox`. Unset, the inbox is off: the job finds no folder and does nothing, and the waiting list stays empty. `docker-compose.yml` sets it to `/import-inbox` on the `import_inbox` volume, see [Deployment](../architecture/deployment.md#import-inbox-folder). It is part of the `Import` switch: with Import off the job does not run and the routes answer `feature.disabled`.

**What the job reads.** Every five minutes `ImportInboxJob` lists the files in the folder and in its direct subfolders, leaving out `done/` and `failed/`, names that start with `.` or `~` or end in `.tmp` or `.part`, and files written less than a minute ago, so a file still being copied waits for the next pass. The format comes from the extension, because there is no person to choose it:

| Extension | Format | Limit |
| --- | --- | --- |
| `.xml` | camt.053 | 20 MB |
| `.ofx`, `.qfx` | OFX | 5 MB |
| `.sta`, `.mt940`, `.940` | MT940 | 5 MB |
| `.csv` | a saved CSV mapping, else Swedbank CSV | 5 MB |

**Whose statement it is.** The account is the one whose IBAN the file names, among the accounts of active members:

- a camt.053, OFX or MT940 file in the root of the folder names its own IBAN (`Stmt/Acct/Id/IBAN`, `BANKACCTFROM/ACCTID`, `:25:`); a file in a subfolder belongs to the account whose IBAN is the subfolder's name, spaces and case ignored, which is also how a camt.053 file with several statements chooses one;
- a CSV file names no account, so it must sit in a subfolder named after the account's IBAN. The file is read with each of the account owner's saved mappings; exactly one that reads it is chosen. When none does and the file is a Swedbank export, it is read as Swedbank CSV. Two mappings that both read it are refused rather than guessed between; a mapping without a header row reads a file with one too, its header line counted as unreadable, so a member who keeps both kinds can see such a file refused as fitting two mappings and import it by hand.

The IBAN must belong to exactly one account. An IBAN no account has, or one that two members both recorded, is refused, and so is a file that does not read as its format. The file then moves to `failed/` (under its subfolder, if it had one) with the reason beside it in `<name>.reason.txt`, for example "No account has the IBAN LT12…. Record it on the account first.".

**Waiting review.** An accepted file is stored as an `ImportInboxFile` row of the account's owner (the bytes, the account, the format, the chosen mapping and the SHA-256), the owner gets an `importWaiting` [notification](notifications.md) naming the file, and the file moves to `done/`. The stored copy is what the review reads, so moving, renaming or deleting the original changes nothing. A file whose SHA-256 the inbox already received in the last 90 days, waiting or not, moves to `done/` without a second review; this is what keeps a sync client that copies the same export again from filling the list.

The provider step of the import dialog lists the owner's waiting files above the providers ("Waiting in the inbox"), each with the account and when it arrived, a Review button and a Dismiss button. Review downloads the stored file (`GET /api/import/inbox/{id}/file`), sends it to the ordinary `POST /api/import/preview` with the stored account, format and mapping, and opens the provider's review with the result, the account preselected and the file name in place of the file input. From there everything is the normal review: views, Switch to, the statement bar and Confirm. A confirmed import removes the file from the list (`DELETE /api/import/inbox/{id}`); Dismiss does the same after asking, without importing anything. A preview that fails, for example because the mapping was deleted since, shows its error as a toast and the file stays listed until dismissed. The Import data panel under Settings › Personal › Import and export says how many statements are waiting, and the notification links there.

**Retention.** Removing a file from the list deletes its stored bytes at once and keeps the row, without them, as the fingerprint. `RetentionJob` deletes every inbox row 90 days after it arrived (`ImportInboxFile.KeptDays`), reviewed or not; the original stays in `done/`, so a statement nobody reviewed in that time can be dropped in again. Nothing ever deletes files from `done/` or `failed/`; that is the host's housekeeping. The table is left out of [backups](backup-and-restore.md), like the outboxes, and out of the [member download](data-export-per-user.md): the waiting files are copies of what the folder holds.

**Administrators.** Settings › Installation › Import inbox (`importInbox`, listed while `Import` is on) shows the folder the API watches, or that the inbox is off, and the 20 most recent files in `failed/` with their reasons (`GET /api/import/inbox/status`). Fixing a refused file is done on the host: record the IBAN on the account or save a mapping by importing one file by hand, then move the file back into the inbox.

## Real bank samples

Not yet checked. Before release, one real camt.053 export each from Swedbank, SEB and Luminor (or the banks the household uses), with personal data removed, should be kept as test samples and checked for where the reference and payee sit, whether batches are split, and whether the Swedbank XML ids equal the CSV's "Įrašo Nr."; the findings go here, per bank. If the Swedbank ids differ and could collide, the references get a format prefix.

The same holds for the generic CSV: the test files in `JxFinance.Tests/Support/SampleCsv.cs` are shaped after Revolut, Wise, a card statement and an older Baltic bank but are not real exports. One real export each from Revolut, Wise and a credit card the household uses, with personal data removed, should be checked for the amount style, the date format and encoding, whether a reference column exists and whether the balance check agrees, and the working mapping for each recorded here so the next person can copy it.
