# Bank statement import

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/swedbank-csv-import.md), [architecture: Transactions, imports and receipts](../architecture/transactions.md), the [plan](../plans/camt053-import.md).

Backend `Imports` (`ImportService`, parsers in `Endpoints/Imports/Parsing`), frontend `imports` (`ImportDataSection`, `ImportDialog`, `ImportSection`, `ImportStatementBar`). No route of its own; the dialog opens from the Import data section under Personal on the one Settings page (`/profile?section=import`), shown to every user while the `Import` switch is on.

The dialog lists two providers, and each one is a statement format:

| Provider | `format` | File | Limit |
| --- | --- | --- | --- |
| Swedbank | `swedbankCsv` | Swedbank account statement exported as CSV | 5 MB |
| Bank statement XML (ISO 20022) | `camt053` | camt.053 "bank to customer statement" from any bank that offers it | 20 MB |

The format is chosen from the list, never sniffed from the file. A file that does not match the chosen format answers `import.invalidFile` with a message naming the expected format. Both formats go through one preview and one confirm: `POST /api/import/preview` (multipart `file`, `accountId`, `format`) and `POST /api/import/confirm` (JSON with `format`, which the audit row names).

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
| `Ntry/RvslInd` | Shown as a "Reversal" chip; the direction still comes from `CdtDbtInd` |
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

A value over 64 characters, or no value at all, becomes `h:` plus the base64url SHA-256 of the date, amount, direction, counterparty IBAN, description and split suffix, which is the same for the same entry every time. A reference that repeats inside one file, such as two identical card payments on one day or a batch whose details share the bank's reference, is hashed again with its occurrence number, so each real entry keeps its own stable reference. References are stored without a format prefix, so if a bank uses the same id in its CSV and its XML, a user switching formats has the overlap flagged as duplicates instead of imported twice.

## Review

The review is the same for both formats. The preview fills each row in twice over. Your [categorization rules](categorization-rules.md) run first: the first rule that matches a row's description, amount and flow type puts its category and its tags on the row and names itself in `matchedRuleName`, which the screen shows as a "Filled by a rule" mark with the rule's name in its tooltip. Where no rule has an opinion, the older recall still guesses a category from the most recent transaction with the same description, marked "Suggested category" as before. A duplicate row gets neither, because it cannot be imported. Both are suggestions: the per-row category select, the per-row tag picker and the "set category for selected" action all replace them, the mark disappears, and the confirm request carries whatever the user decided — including `tagIds`, which `ImportService` writes as `TransactionTags` beside the new transaction in the same database transaction.

Since 2026-09-26, while the `UnusualAmounts` switch is on, the preview also judges each expense row the way the background check will once it is stored: `IUnusualAmountService.EvaluateAsync` runs once over all the expense rows, valued at the rate for each row's date, against the same payee on the target account or, failing that, the category a rule suggested. A row far above its usual amount answers `unusual` and shows an "Unusual amount" mark with the sentence, such as "3.1× the usual €41.50 for this payee", in its tooltip; a duplicate row never shows it. It is information only and is not sent back: confirmed rows arrive unchecked and the job evaluates them, so the stored flag has one source. See [Unusual amounts](unusual-amounts.md).

A row looks like a transfer when its payee or description holds a transfer keyword, or when its counterparty IBAN is the IBAN of another account you can see. In the second case `suggestedTransferAccountId` names that account and the row's "Record as" picker starts on it; the row still starts unselected, like every suspected transfer, and nothing is recorded until the user selects it.

The preview also answers `statement`, which the statement bar above the rows shows for a camt.053 file:

- the statement's IBAN, and when it is not the IBAN recorded for the chosen account, a warning. When the IBAN belongs to another account you can see, `otherAccountId` names it and "Switch to …" re-runs the preview for that account with the same file. A user who has recorded no IBANs can still import.
- how many pending or informational entries were skipped and how many entries could not be read.
- the closing balance next to the ledger. `ledgerBalanceAtClose` is the account's balance on the closing date — starting balance plus every movement in the account's currency up to that date — and is filled only when the account's currency is the statement's. The bar adds the selected rows to it and says in words whether the result matches the closing balance or by how much it differs.

```mermaid
sequenceDiagram
    actor User
    participant Dlg as ImportDialog
    participant Api as ImportService
    participant Db as PostgreSQL
    User->>Dlg: choose a provider, target account, file
    Dlg->>Api: POST /api/import/preview with format
    Api->>Api: SwedbankCsvParser or Camt053Parser: rows, IBAN, closing balance, skipped counts
    Api->>Api: categorization rules: first match per row, by description, amount and type
    Api->>Db: existing references: transactions incl. deleted, TransferImport receipts
    Api->>Db: while UnusualAmounts is on: one history query for the expense rows,<br/>judged against their payee or the rule's category
    Api->>Db: accounts with IBANs, ledger balance on the closing date
    Api-->>Dlg: rows with isDuplicate, looksLikeTransfer, suggestedTransferAccountId,<br/>isReversal, suggestedCategoryId, suggestedTagIds, matchedRuleName, unusual;<br/>statement summary
    Dlg->>Dlg: duplicates never selected, suspected transfers start unselected
    Dlg->>Dlg: where no rule matched, category recall:<br/>exact description and type among the latest 200
    User->>Dlg: per row: income or expense with category and tags,<br/>new transfer with another account,<br/>or match an existing transfer
    Dlg->>Api: POST /api/import/confirm with format, selected rows only
    Api->>Db: begin transaction, advisory lock on the account id
    Api->>Api: matching verifies date, amount and direction
    alt transfer already holds a receipt for this account
        Api-->>Dlg: import.transferAlreadyMatched, nothing written
    else ok
        Api->>Db: transactions, transfers, TransferImport receipts, one audit row naming the format
        Api-->>Dlg: result, link to the imported rows
    end
```

Confirm reads everything the rows can need before it walks them: the references already imported, the tags and categories they name, the currencies of the accounts they transfer to, the transfers they claim to match and the receipts those transfers already carry, and the exchange-rate history covering the dates it has to convert. The loop then adds rows without asking the database again, so a file of ten thousand entries costs a fixed number of queries instead of one per row. `ITransferAmountResolver.Resolve` is the synchronous half of the resolver, taking the two account currencies the caller already knows.

Every confirmed row goes through the paths the manual forms use. A transaction row is valued by `ITransactionValuation`, so a row whose currency is switched off answers `currency.disabled`. A new transfer row goes through `ITransferAmountResolver`, the resolver of `POST /api/transfers`: the bank entry fixes the amount on the imported side, the other side is taken in its account's currency, and when the two differ the row answers `transfer.receivedAmountRequired`, because a statement line carries only one of the two amounts. Such a transfer is recorded under Transfers and the bank entry matched to it. Like every other confirm error, nothing of that request is written.

## Real bank samples

Not yet checked. Before release, one real camt.053 export each from Swedbank, SEB and Luminor (or the banks the household uses), with personal data removed, should be kept as test samples and checked for where the reference and payee sit, whether batches are split, and whether the Swedbank XML ids equal the CSV's "Įrašo Nr."; the findings go here, per bank. If the Swedbank ids differ and could collide, the references get a format prefix.
