# Plan: CAMT.053 statement import

Implemented 2026-09-27; see [Bank statement import](../features/bank-statement-import.md). Built more simply than planned in a few places: the two parsers are static classes chosen by a two-way branch in `ImportService` rather than keyed `IStatementParser` services; the statement summary carries one `notBooked` count for pending and informational entries and only the closing balance, not the opening one; rows carry `suggestedTransferAccountId` but not the counterparty IBAN itself; a wrong format is `enum.invalid` from the validator, so `import.unsupportedFormat` was not added; and `SwedbankCsvParserTests` were not written, because the integration tests cover the CSV parser end to end. The real-bank sample check under "Before release" is still open.

Status: planned 2026-09-26. Size M. Independent of the other plans. If it lands before [Unusual amounts](unusual-amounts.md), that plan's import-preview step applies to the shared preview pipeline built here instead of to `PreviewSwedbankCsvAsync`.

## Outcome

The import dialog gets a second provider: a bank statement in ISO 20022 XML (camt.053, the "bank to customer statement"). Most EU banks offer it in internet banking, alongside or instead of their own CSV, so one parser can cover banks that would otherwise need a column mapping each.

The review step is the one the Swedbank CSV import already has:

- preview with row selection;
- duplicate detection;
- rule and recall suggestions;
- tags;
- explicit transfer matching.

The structured fields make three things better than CSV:

- the statement names its account by IBAN, so the dialog can warn when the file belongs to another account;
- a counterparty IBAN that matches one of the user's own accounts proposes the transfer directly;
- the statement's closing balance can be compared with the ledger.

## What the format gives us

The parser reads these elements, matched by local name so that versions `001.02` to `001.13` all work:

| Element | Use |
| --- | --- |
| `BkToCstmrStmt/Stmt` | One per account and period; a file can hold several |
| `Stmt/Acct/Id/IBAN`, `Stmt/Acct/Ccy` | Account match and warning |
| `Stmt/Bal` with `Tp/CdOrPrtry/Cd` = `OPBD`/`CLBD` | Opening and closing booked balance for the balance check |
| `Ntry/Amt/@Ccy`, `Ntry/CdtDbtInd` (`CRDT`/`DBIT`) | Amount, currency and direction |
| `Ntry/Sts` (or `Sts/Cd` from 001.08) | Only `BOOK` is imported; `PDNG` and `INFO` are counted and skipped |
| `Ntry/BookgDt/Dt` or `DtTm`, else `ValDt` | Date. A `DtTm` is converted to the installation time zone |
| `Ntry/RvslInd` | Shown as a "Reversal" chip; the direction still comes from `CdtDbtInd` |
| `Ntry/AcctSvcrRef`, `NtryDtls/TxDtls/Refs/AcctSvcrRef`, `Refs/EndToEndId`, `Ntry/NtryRef` | Import reference, see below |
| `TxDtls/RltdPties/Cdtr` or `Dbtr` (`Nm`, or `Pty/Nm` from 001.08) | Payee: the creditor for a debit, the debtor for a credit |
| `TxDtls/RltdPties/CdtrAcct` or `DbtrAcct` `/Id/IBAN` | Counterparty IBAN for transfer detection |
| `TxDtls/RmtInf/Ustrd` (joined), else `RmtInf/Strd/CdtrRefInf/Ref`, else `AddtlTxInf`, else `Ntry/AddtlNtryInf` | Description, clipped to 500 |

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Structure | Extract a format-neutral pipeline from `ImportService`: `IStatementParser` implementations (`SwedbankCsvParser`, `Camt053Parser`) return a `ParsedStatement`, and one preview path adds duplicates, suggestions and transfer hints. Confirm is already format-neutral and stays one path | A second service copying the preview | The duplicate, suggestion and transfer rules must be identical for both formats |
| Choosing the format | Explicit, from the provider list the dialog already shows | Sniffing the file | Deliberate entry. A wrong file answers `import.invalidFile` naming the expected format |
| Routes | `POST /api/import/preview` (multipart: `file`, `accountId`, `format`) and `POST /api/import/confirm` (JSON with `format`). The `/swedbank/*` routes are removed | Keeping the Swedbank routes and adding `/camt053/*` | The app is unreleased and the client is generated, so a clean contract costs nothing. `format` in confirm names the source in the audit row |
| Batch entries | An `Ntry` with several `TxDtls` whose amounts add up to the entry becomes one row per `TxDtls`. Otherwise it stays one row with the entry's text | Always one row per `Ntry` | Banks book card batches and salary runs as one entry. The details are what the user categorises |
| Import reference | The first non-empty of the `TxDtls` `AcctSvcrRef`, the `Ntry` `AcctSvcrRef` plus `/` plus the detail index, `NtryRef`, and `EndToEndId` (skipping `NOTPROVIDED`). A value over 64 characters, or no value at all, becomes `h:` plus a base64url SHA-256 of the date, amount, direction, IBAN and description, cut to 64. Refs are stored unprefixed | Prefixing every CAMT ref with the format | If a bank uses the same id in its CSV and its XML, a user switching formats gets the overlap flagged as duplicates instead of imported twice. Verify this with a real Swedbank export of both formats for the same month before release, and add a prefix only if the ids differ and could collide |
| Account | The file's IBAN is compared with the chosen account's `Iban`. A mismatch, or a file with several statements, shows a warning naming the statement's IBAN and, when it belongs to another visible account, offers to switch. Only the statement matching the chosen account is previewed, or the only one | Refusing mismatches | A user without IBANs recorded must still be able to import |
| Currency | Taken per entry from `Amt/@Ccy`, exactly as the CSV's `Valiuta` column is | Forcing the account currency | Same rule as today; valuation and `currency.disabled` stay in `ITransactionValuation` |
| Validation | Tolerant reading by local name, no XSD validation. An unreadable entry is counted and shown ("2 entries could not be read") rather than failing the file | Validating against the schemas | Banks deviate from the schemas in small ways; the Flex parser set this precedent |
| XML safety | `DtdProcessing.Prohibit`, `XmlResolver = null`, `MaxCharactersInDocument` of 100 million, 20 MB at the endpoint | — | As `FlexParser`, plus a document size cap. Add a DTD and XXE rejection test for both parsers |

## Backend steps

1. **Types.**
   - `Endpoints/Imports/Parsing/`:
     - `StatementFormat { SwedbankCsv, Camt053 }`;
     - `IStatementParser` with `Format` and `Result<ParsedStatement> Parse(Stream, ct)`.
   - `ParsedStatement` carries:
     - `Rows`;
     - `AccountIban?`;
     - `Currency?`;
     - `OpeningBalance?` and `ClosingBalance?` (date, `Money`);
     - `Skipped` (pending, informational, unreadable).
   - `ParsedRow` gains `CounterpartyIban?` and `IsReversal`.
   - The parsers are registered as keyed services by format.
2. **Move the Swedbank CSV parser.** `ParseCsv` moves out of `ImportService` into `SwedbankCsvParser` unchanged. The existing integration tests must pass without edits, apart from the route.
3. **CAMT parser.** `Camt053Parser` has these pieces:
   - the root check: `Document` with a namespace starting `urn:iso:std:iso:20022:tech:xsd:camt.053.001.`;
   - statement selection;
   - entry and detail flattening;
   - the reference rule;
   - the description rule;
   - the status filter;
   - balances.
   Local-name helpers are shared with nothing: the Flex format has no namespaces.
4. **Preview.** `ImportService.PreviewAsync(format, accountId, stream)`:
   - It parses, then runs the existing `ExistingRefsAsync` and `SuggestionsAsync`.
   - It computes transfer hints: `LooksLikeTransfer` stays for text. Separately, a `CounterpartyIban` equal to another visible account's IBAN sets `SuggestedTransferAccountId`.
   - It returns `ImportPreviewResponse(Rows, Statement)`. `Statement` holds:
     - `Iban?`;
     - `IbanMatchesAccount`;
     - `OtherAccountId?`;
     - `Skipped` counts;
     - `ClosingBalance?`;
     - `LedgerBalanceAtClose?`, which is the account's balance in the statement currency on the closing date, from the account balance service. It is filled only when the account's main currency equals the statement currency.
   - `ImportPreviewRow` gains `IsReversal`, `CounterpartyIban?` and `SuggestedTransferAccountId?`.
5. **Confirm.** `ImportConfirmRequest` gains `Format`. The audit summary label becomes `"{format label} into {name}"`. `AddRowsAsync`, the transfer matching and the lock are unchanged.
6. **Endpoints.** Replace `ImportPreviewEndpoint` and `ImportConfirmEndpoint` routes as above:
   - size limit 5 MB for CSV and 20 MB for XML, checked by format;
   - `FeatureGateTests` stays green because the routes stay under `ApiRoutes.Import`;
   - the summaries document both formats.
7. **Error codes.** `import.invalidFile` stays, with a message naming the format. New codes:
   - `import.noStatementForAccount`, for a file with several statements and none for this account, answered with the list of IBANs;
   - `import.unsupportedFormat`.
8. **Docs mismatch.** `docs/architecture/transactions.md` says import is not restricted by the currency rules, but the code refuses disabled currencies. Correct it while touching the import.

## Frontend steps

1. `just gen`. The generated `useImportPreview`/`useImportConfirm` change routes, and `invalidation.ts` keeps the same roots. Add the new `serverErrors.import.*` texts in both locales.
2. **Dialog.** `import-dialog.tsx`'s `providers` gains:
   - `{ id: "camt053", name: "Bank statement XML (ISO 20022)", formatKey: "imports.providers.camt053Format" }`, whose hint says to download "XML / ISO 20022 / camt.053" from internet banking;
   - Swedbank keeps its entry.
   `ImportSection` takes `format`. `ImportUploadForm` takes `accept` and the size limit from a small `importFormats` table.
3. **Preview extras.**
   - A statement bar above the table showing:
     - the IBAN;
     - a mismatch warning with a "Switch to {account}" button that re-runs the preview;
     - skipped counts;
     - the closing balance next to the ledger's balance with the difference after the selected rows.
     The balance difference is text, not colour alone.
   - A "Reversal" chip.
   - A suggested transfer from the IBAN pre-fills the transfer picker's account. The row still starts unselected, like other suspected transfers, and the user confirms it.
4. **Copy.** Fix `imports.fileHint`, which says "in EUR".
5. **Tests.**
   - Stories:
     - the provider list with two entries;
     - a CAMT upload;
     - an IBAN mismatch;
     - a balance that agrees and one that does not;
     - a batch entry split into details;
     - skipped pending entries.
   - Fixtures in `storybook/fixtures/imports.ts` and a sample XML beside `transactionsCsv`. The `import-play.ts` helper takes the format.
   - Update `e2e/import.spec.ts` and add one CAMT flow.

## Tests

- **Unit, in `Camt053ParserTests` with inline samples in `Support/SampleCamt053.cs`:**
  - 001.02 and 001.08 shapes, including `Sts` versus `Sts/Cd` and `Nm` versus `Pty/Nm`;
  - credit and debit;
  - a reversal;
  - `BookgDt/DtTm` in another time zone;
  - a batch split, and a batch whose details do not add up and stays one row;
  - pending and informational entries skipped;
  - each step of the reference fallback, including over 64 characters and missing, with the hash deterministic;
  - unstructured text joined and clipped;
  - multiple statements;
  - a wrong root or namespace;
  - a DTD refused.
  Add the same DTD test to `FlexParserTests`. `SwedbankCsvParserTests` can now exist, since the parser is public.
- **Integration:**
  - A CAMT preview then confirm writes the rows with valuations and tags.
  - Importing the same file again flags every row as a duplicate.
  - Rows already confirmed as transfers are deduplicated through `TransferImports`.
  - The IBAN mismatch fields.
  - The counterparty IBAN suggestion.
  - A disabled currency is refused.
  - The audit row names the format.
  - The feature switch hides the routes.
  - All existing Swedbank tests pass on the new routes.

## Docs

- Rename `docs/features/swedbank-csv-import.md` to `docs/features/bank-statement-import.md`, with a section per format and the shared review steps once. Include the element table and the reference rule above.
- Updates to:
  - `docs/scope.md`;
  - `docs/user-flows.md` ("currently only Swedbank");
  - `docs/api.md` (routes);
  - `docs/features/audit-log.md` (label);
  - `docs/decisions/swedbank-csv-import.md`: the rows above, plus the generic CSV mapper moving behind this in the suggested order;
  - `docs/backlog.md`;
  - `PRODUCT.md` ("provider list, then Swedbank CSV review").

## Before release

Collect one real camt.053 export each from Swedbank, SEB and Luminor (or whichever banks the household uses), with personal data removed. Keep them as test samples, and confirm three things on each:

- where the reference and payee sit;
- whether batches are split;
- whether the Swedbank XML ids equal the CSV's "Įrašo Nr.".

Record per bank what was found in the feature doc.

## Later, not in this plan

- camt.052 (intraday report) and camt.054 (debit and credit notifications): the same entries under `Rpt` and `Ntfctn`. The parser can accept them by name once there is a reason to.
- A zip with several statements in it.
- Recording the format on the transaction: today only the audit row names it.
- Keeping deleted imports deduplicated after the 30-day trash window. This is an existing limitation of both formats, because `RetentionJob` purges the soft-deleted rows the duplicate check reads.
