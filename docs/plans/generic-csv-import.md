# Plan: Generic CSV import

Status: planned 2026-09-28. Size M. Rows from a mapped CSV go through the existing [match to hand-entered rows](../features/bank-statement-import.md#entries-you-already-made-by-hand), so they are matched to hand-entered ones from the start. Since [refunds](../features/transactions.md#refunds) shipped on 2026-09-29, a mapped incoming row goes through the same review and can be recorded as a refund, proposed like a Swedbank or camt.053 row. The backlog puts it after a real month of imports, to see how often it is needed.

## Outcome

- The import dialog gets a third kind of provider, "Other bank (CSV)". The user uploads a CSV export from any bank, card issuer or payment app. They see its columns with a few sample values under each, and say once which column is the date, the amount, the description and so on.
- The mapping is saved under a name ("Revolut", "Wise", "SEB card"). It then appears in the provider list next to Swedbank and camt.053, so the next month's file goes straight to the review.
- The review is the one the other formats have:
  - duplicates;
  - rule and recall suggestions;
  - unusual amounts;
  - tags;
  - transfers;
  - hand-entered matches.
- A mapping can read:
  - one signed amount column, either sign meaning money out;
  - separate debit and credit columns;
  - an amount with a direction column;
  - a decimal comma or point;
  - common date formats;
  - UTF-8, UTF-16 and the Baltic and Western Windows code pages;
  - comma, semicolon, tab or pipe delimiters;
  - a few lines above the header.
- Credit-card statements import into a card account, where a positive amount is a purchase and a negative one a payment or a refund. This closes the "No credit-card statements" gap in the backlog for issuers that offer CSV.
- A saved mapping can be edited or deleted from the provider list. A deleted one goes to the trash like a categorization rule.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Where it lives | In the import dialog: saved mappings are providers, and the mapping form is a step of the dialog | A mappings page under Settings | Fewer pages. The mapping is only ever needed while a file is open, and its sample values come from that file |
| Ownership | `CsvImportMapping` is a personal `OwnableEntity`, not `IShareable` | Shared household mappings | Like a categorization rule, it is one person's setup. Two members importing the same bank can each save one in a minute |
| Columns | Referenced by header name. A header row is required | Referenced by position | Banks reorder and add columns. A missing mapped name answers `import.missingColumns` naming the columns instead of silently reading the wrong one |
| Which saved mapping fits a file | A mapping fits when every column it names is in the file's header. The inspect call returns those mappings, and the dialog offers the first one | Storing a header fingerprint | No extra column, and it survives a bank adding a column |
| Amount styles | `SignedNegativeIsExpense`, `SignedPositiveIsExpense` (card statements), `DebitCredit` (two columns, the filled one wins, both filled is unreadable) and `AmountWithDirection` (a column whose value, compared ignoring case, equals the mapping's `ExpenseValue` for money out) | A formula field | These four cover Revolut, Wise, the Baltic banks' CSVs and card statements. A formula is a small language to validate and explain |
| Fee | An optional fee column whose absolute value is added to money out, so a Revolut row of −10.00 with a fee of 0.50 imports as a 10.50 expense | Importing the fee as a second row | One bank line, one ledger row, and the net matches the running balance |
| Status filter | An optional status column with a comma-separated list of values that are booked (Revolut: `COMPLETED`). Other rows are counted in `NotBooked` | Importing pending and reverted rows | A pending or reverted card payment is not money that moved; camt.053 already skips non-`BOOK` entries the same way |
| Numbers | The mapping stores `DecimalSeparator` (`Dot` or `Comma`). Parsing drops spaces, no-break spaces, apostrophes, currency signs and letters, and the other separator as a thousands mark. It reads `(12.50)` and a trailing minus as negative, then goes through `DecimalRules.ParseMoneyText`. More than two decimals makes the row unreadable | Guessing per row | A stored choice is predictable. Inspect proposes it from the samples: a comma followed by exactly two digits at the end means `Comma` |
| Dates | `DateFormat` is one of a fixed list: `yyyy-MM-dd`, `dd.MM.yyyy`, `dd/MM/yyyy`, `MM/dd/yyyy`, `dd-MM-yyyy`, `yyyy.MM.dd`, `yyyy/MM/dd`, `d.M.yyyy`. The text before the first space or `T` is parsed, so a time is dropped | Free-form patterns; parsing with the server culture | A list can be validated and shown as examples. Inspect offers only the formats that parse every sample. When a day above 12 does not settle `dd/MM` against `MM/dd`, both are offered and the user chooses |
| Encoding | A byte-order mark decides UTF-8 or UTF-16. Otherwise the mapping's `Encoding` (`Utf8`, `Windows1257`, `Windows1252`) is used. Inspect proposes `Windows1257` when the bytes are not valid UTF-8 | Always UTF-8 | Older Baltic bank exports are Windows-1257, and "Įrašo" would arrive broken. `CodePagesEncodingProvider` is registered once at startup |
| Delimiter | Inspect detects it with CsvHelper's `DetectDelimiter` over `,` `;` tab and `|`. The mapping stores it, and preview uses the stored one | Detecting on every preview | Detection can flip on a short file; a stored value cannot |
| Lines above the header | `SkipLines`, 0 to 20. Inspect proposes the first line followed by a line with the same number of cells | Asking the user to edit the file | Several card statements start with an account block |
| Currency | A currency column, else the mapping's fixed `Currency`, else the account's currency | Always the account currency | Revolut and Wise exports hold several currencies in one file, and an account can hold balances in any supported currency |
| Import reference | With a reference column: its value when it is not empty and at most 64 characters, stored unprefixed like camt.053 references. Otherwise, or when the value is too long: `h:` plus the base64url SHA-256 of the raw date cell, the signed amount, the currency, the description, the payee and the raw balance cell. A reference that repeats inside one file is hashed again with its occurrence number | A per-row counter; a prefix per mapping | The hash and the occurrence rule are the camt.053 ones, moved into a shared helper. The raw date cell keeps Revolut's time of day and the balance cell tells two equal coffees apart, so the hash is stable across overlapping exports. No mapping id in the hash, so recreating a mapping does not re-import everything |
| Closing balance | With a balance column, the statement summary's closing balance is the balance of the row with the latest date: the last row when the file is oldest first, the first when it is newest first. `SignedPositiveIsExpense` negates it, because a card's positive balance is money owed | No balance check for CSV | It reuses the statement bar and its ledger comparison unchanged |
| Tolerance | A row that cannot be read (bad date, bad number, both debit and credit) is counted in `Unreadable`, as camt.053 does. A file with no readable row answers `import.invalidFile` | Failing the whole file on one bad row, as the Swedbank parser does | Card statements end with total and summary lines that are not entries. The count tells the user something was left out |
| Format wiring | `StatementFormat.GenericCsv` appended. Preview and confirm take an optional `mappingId`, which is required for this format. `ImportService` picks the parser with a switch over the three formats | An `IStatementParser` interface | The camt.053 decision chose a branch over an interface for two formats. A three-arm switch is still less code than an interface with registrations |
| Credit cards | No new account type. A card is an account of type `Other` with a negative starting balance. Paying the card from the current account is a transfer, matched on both imports as today | `AccountType.CreditCard` with liability handling in net worth | Balances are already signed, so net worth counts a card's debt correctly. A type would only change the icon and label; see open questions |

## Data model

| Change | Detail |
| --- | --- |
| `CsvImportMapping` | New `OwnableEntity` in `Domain/Imports/`, with id `CsvImportMappingId`. Fields: `Name` (max 60), `Encoding` (`CsvEncoding`), `Delimiter` (one character), `SkipLines` (int), `AmountStyle` (`CsvAmountStyle`), `DateFormat` (max 12, one of the listed patterns), `DecimalSeparator` (`CsvDecimalSeparator`), `Currency?` and `Columns` |
| `Columns` | `CsvColumnMap`, stored as `jsonb` the way `Notification.Payload` is. Fields: `Date` (required), `Description?`, `Payee?`, `Amount?`, `Debit?`, `Credit?`, `Direction?`, `ExpenseValue?`, `Currency?`, `Reference?`, `Balance?`, `Fee?`, `Status?`, `BookedValues?`. Every name is at most 200 characters. JSON keeps the migration small and lets a later column type be added without one |
| Index | (UserId, Name) for the list, where not deleted |
| `TrashKind.CsvImportMapping` | Appended; restored by a restorer in `TrashRestorers` like `CategorizationRule` |
| `StatementFormat.GenericCsv` | Appended to the enum in `Endpoints/Imports/Parsing/ParsedStatement.cs` |

Backups carry the new table without code, because `BackupService` reads the table list from the EF model.

## Backend steps

1. **Shared reference helper.** Move `Camt053Parser.Hashed` and the occurrence loop into `Endpoints/Imports/Parsing/ImportReferences.cs` (`Hash(string)`, `Disambiguate(List<ParsedRow>)`). `Camt053ParserTests` must pass unchanged.
2. **Entity and migration.** Add `CsvImportMapping`, its configuration with the `jsonb` column, and `TrashKind.CsvImportMapping`. Then run `just migrate-add AddCsvImportMappings`.
3. **Encoding.** Register `CodePagesEncodingProvider.Instance` in the startup extensions. `Parsing/CsvText.Open(Stream, CsvEncoding)` returns a `TextReader` that honours a BOM first.
4. **Inspector.** `Parsing/CsvInspector.Inspect(Stream, CsvEncoding?, string? delimiter, int? skipLines)` proposes the encoding, delimiter and header line, and returns up to 10 sample rows of raw cells. It also returns the date formats that parse every sample of each column, and the proposed decimal separator per column. It is pure and static, like the parsers.
5. **Parser.** `Parsing/GenericCsvParser.Parse(Stream, CsvImportMapping, Currency accountCurrency)` returns `Result<ParsedStatement>`. It applies the decisions above, fills `NotBooked`, `Unreadable`, `ClosingDate` and `ClosingBalance`, and caps the file at 10,000 rows like the Swedbank parser. Rows with a zero amount after the fee are counted in `NotBooked`. `IsReversal` stays false and `CounterpartyIban` stays null.
6. **Mapping endpoints**, under `ImportsGroup` so the `Import` switch hides them:
   - `GET /api/import/csv-mappings`, the caller's mappings by name;
   - `POST /api/import/csv-mappings` to create one;
   - `PUT /api/import/csv-mappings/{id}` to update one;
   - `DELETE /api/import/csv-mappings/{id}` through `DeleteEndpoint` and `IDeletionRecorder`.
   Slices are `ListCsvMappings`, `CreateCsvMapping`, `UpdateCsvMapping` and `DeleteCsvMapping`, scaffolded with `just new-endpoint`. They share `Shared/CsvMappingResponse` and a `CsvMappingInputValidator`, and the work is in a new `Services/CsvMappingService`. The validator checks four things:
   - the name;
   - the enums;
   - the date format against the list;
   - that the amount style has its columns (`Amount` for the signed styles, `Debit` and `Credit`, or `Amount`, `Direction` and `ExpenseValue`).
7. **Inspect endpoint.** `POST /api/import/csv/inspect`, multipart `file` (at most 5 MB) with optional `encoding`, `delimiter` and `skipLines` for a retry after the user corrects them. It answers `CsvInspectResponse`:
   - the proposals;
   - `headers`;
   - `samples`;
   - `dateFormats`;
   - `decimalSeparators`;
   - `matchingMappingIds`.
   The slice is `InspectCsv`, and the method is `IImportService.InspectCsvAsync`, because the fitting mappings are read from the database.
8. **Preview and confirm.**
   - `ImportPreviewRequest` and `ImportConfirmRequest` gain `MappingId?`. `ImportPreviewValidator` requires it for `GenericCsv` and keeps the 5 MB limit for every CSV.
   - `PreviewAsync` loads the mapping (`reference.notFound` when it is not the caller's) and calls `GenericCsvParser`. Everything after parsing is shared: duplicates, suggestions, unusual amounts, hand-entered matches and transfer hints.
   - Confirm uses the mapping only for the audit label, "{mapping name} CSV into {account}". A small `FormatLabel` replaces the current two-way ternary.
9. **Error codes**, with English and Lithuanian text in `frontend/src/locales/*/common.json`:
   - `import.missingColumns`, with the missing names in the message;
   - `import.mappingIncomplete`, for an amount style without its columns;
   - `import.invalidDateFormat`, for a date format outside the list.
   A wrong file stays `import.invalidFile`.
10. **Summaries.** Update `ImportPreviewSummary` and `ImportConfirmSummary` for the third format, and give the new endpoints their own summaries.

## Frontend steps

1. `just gen`. List the mapping mutations in `src/api/invalidation.ts` against the csv-mappings root.
2. **Provider list.** `import-dialog.tsx`'s `providers` becomes:
   - the two fixed entries;
   - one entry per saved mapping ("Revolut", format line "Your CSV mapping");
   - "Other bank (CSV)" last.
   A saved mapping's row gets Edit and Delete actions; Delete uses the undo toast pattern of the trash. `importFormats` in `import-upload-form.tsx` gains `genericCsv` with `.csv,.txt,text/csv` and 5 MB.
3. **Mapping step.** A new component, `features/imports/csv-mapping-form/csv-mapping-form.tsx`, built with `just new-component imports csv-mapping-form`. After "Other bank (CSV)" and a file, the dialog calls inspect. When a saved mapping fits, it offers "Use Revolut" above the form. The form follows step 4 of [Adding a feature](../adding-a-feature.md) and has these fields:
   - name;
   - amount style as segments with a one-line example each;
   - a select per role listing the headers, each option showing the first two sample values;
   - date format and decimal separator, offering the proposed ones first;
   - currency (fixed, or a column);
   - the optional reference, balance, fee and status columns, the status one with the booked values;
   - encoding, delimiter and lines above the header, which re-run inspect when changed.
   A small sample table under the form shows the raw cells of the first five rows, so the user sees what each column holds. Save creates the mapping and runs the preview with the same file.
4. **Edit.** Edit opens the same form over the saved mapping. With a file chosen it shows that file's samples, otherwise the header names only. Saving over a mapping that has been used says in its hint that rows without a reference column get new references when the description, payee or balance column changes.
5. **Section.** `ImportSection` takes `mappingId` and passes it to preview and confirm. The statement bar needs no change, because `closingBalance`, `notBooked` and `unreadable` arrive as for camt.053. For this format the `notBooked` text becomes "{{count}} rows left out by the status filter or with a zero amount", under a new `imports.statement.skipped_*` key in both locales.
6. **Copy.** Add `imports.providers.genericCsv` and `genericCsvFormat`, the form's labels and hints, and the three new `serverErrors.import.*` texts, in English and Lithuanian with plural forms.
7. **Stories and fixtures.**
   - `storybook/fixtures/imports.ts` gains a Revolut-shaped and a card-shaped inspect response and a saved mapping.
   - Stories cover:
     - the provider list with a saved mapping;
     - the mapping form for each amount style;
     - an ambiguous date format;
     - the "Use Revolut" offer;
     - a preview with unreadable rows.
   - The `import-play.ts` helper takes the format and mapping.

## Tests

- **Unit,** in `GenericCsvParserTests` and `CsvInspectorTests`, with inline samples in `Support/SampleCsv.cs`:
  - each of the four amount styles, and a card statement where a payment is income;
  - a decimal comma with a dot or space for thousands, parentheses, a trailing minus and a currency sign;
  - each listed date format, with and without a time;
  - Windows-1257 text with "ąčęėįšųūž", a UTF-16 file with a BOM and a UTF-8 file with a BOM;
  - semicolon and tab delimiters, and two lines above the header;
  - a missing mapped column, the status filter count, a zero amount, the fee;
  - the reference column used as is, too long and hashed, repeated in the file and disambiguated;
  - the hash staying the same when the file is exported again with more rows;
  - the closing balance for oldest-first, newest-first and a card statement;
  - inspect proposals for the encoding, the delimiter, the header line and the date formats, with `dd/MM` against `MM/dd` left ambiguous;
  - `Camt053ParserTests` still passing after the helper move.
- **Integration:**
  - Mapping create, list, update and delete. Another user's mapping answers 404 on update and delete and `reference.notFound` on preview.
  - A deleted mapping is restored from the trash.
  - Inspect returns the fitting mappings.
  - A generic CSV preview then confirm writes the rows with valuations, tags and the audit label naming the mapping.
  - The same file again flags every row as a duplicate, and an overlapping export flags only the overlap.
  - A row matching a hand-entered transaction is offered as a link.
  - A multi-currency file values each row in its own currency, and a disabled currency is refused.
  - The `Import` switch hides the new routes, and `FeatureGateTests` stays green.
  - The validator error codes are covered by `ValidatorErrorCodeTests`.
- **End to end:** one flow in `frontend/e2e/import.spec.ts` that maps a small Revolut-shaped file, saves the mapping, imports it, and imports the next file through the saved provider.

## Docs

- `docs/features/bank-statement-import.md`:
  - a "Generic CSV" section with the mapping fields, the four amount styles, number, date and encoding rules, the reference rule and the credit-card recipe;
  - the provider table gains the row;
  - the camt.053 reference paragraph points to the shared helper.
- `docs/decisions/swedbank-csv-import.md`: a dated Log entry for each decision above that chose between real alternatives, and Current updated to three formats.
- `docs/data-model.md`: `CsvImportMapping` and its `jsonb` column.
- `docs/api.md`: the five new routes, `mappingId` on preview and confirm, and the three error codes.
- `docs/scope.md`, `docs/user-flows.md` (Import bank data) and `PRODUCT.md` if it names the providers.
- `docs/features/trash-and-undo.md`: the new kind.
- `docs/backlog.md`:
  - remove the "Swedbank CSV and camt.053 XML only" and "No credit-card statements" gaps and the idea row;
  - update `docs/features/README.md`'s "Not implemented" sentence and `docs/scope.md`'s "Outside this release" list, which name credit-card statements;
  - add a Done row.

## Before release

Collect one real export each from Revolut, Wise and a credit card the household uses, with personal data removed, as test samples. For each, confirm:

- which amount style fits;
- the date format and encoding;
- whether a reference column exists;
- whether the balance check agrees.

Record the working mapping for each in the feature doc, so the next person can copy it.

## Later, not in this plan

- Revolut and Wise currency exchanges arrive as an expense and an income in two currencies of the same account. Recording them as a currency conversion needs a pairing rule; until then the user leaves them unselected.
- Card statements only as PDF: see [Receipt OCR](receipt-ocr.md) for the only text extraction planned.
- Sharing a mapping with the household, and exporting or importing a mapping as a file.
- A generic trade CSV for investments; the backlog lists it separately.

## Open questions

- Should a credit card get its own `AccountType.CreditCard`, shown as a liability in net worth and preselected with `SignedPositiveIsExpense`, or is `Other` with a negative balance enough for now?
- Should the mapping form also accept files without a header row, with columns chosen by position? None of the target exports needs it.
