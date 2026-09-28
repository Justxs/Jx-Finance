# Plan: Match imports to hand-entered rows

Status: planned 2026-09-28. Size S. Almost all of it is already built in the uncommitted working tree (see "Done so far"); what is left is a few tests, an end-to-end step, one user-flows sentence and the checks. Build it before [Generic CSV import](generic-csv-import.md) and [Refunds](refunds.md), because both add rows to the same preview and every import improvement is worth less while a hand-entered row is imported twice.

## Outcome

- A person who typed a purchase in by hand and later imports the bank statement no longer gets it twice. The preview shows the bank row as "Matches your entry", with the date and description of the hand-entered row in its tooltip.
- A matched row starts selected. Its "Record as" picker offers "Your entry of {date}", beside "Income / expense" and the transfers. Confirming it adds nothing: the bank entry is linked to the hand-entered row.
- The hand-entered row keeps its date, category, tags, description and splits. From then on it counts as imported, so the same bank entry is flagged "Already imported" in the next preview.
- The toast and the result line say how many rows were linked, beside imported and skipped.
- A proposal the user does not want is declined by choosing "Income / expense" or a transfer in the same picker. The row is then imported as a new transaction, as before.

## Done so far

Checked against the working tree on 2026-09-28.

| Piece | Where | State |
| --- | --- | --- |
| Matcher | `backend/JxFinance.Api/Endpoints/Imports/Matching/ManualEntryMatcher.cs`: `StatementLine`, `ManualEntry` with `Fits` and `DaysFrom`, `ManualEntryMatcher.Match` with `MaxDays = 3` | Done. Same `FlowType`, equal `Money` (amount and currency), dates at most three days apart. Pairs are taken closest date first, then file order, then entry date and id, and each entry goes to at most one line |
| Preview | `ImportService.ManualMatchesAsync`, called from `PreviewAsync` after duplicates are known | Done. One query over `Source == Manual`, `ImportRef == null` transactions on the account between the earliest date minus three days and the latest date plus three. Duplicate rows are never matched |
| Preview contract | `Imports/Shared/ImportMatchedTransaction.cs` (`Id`, `Date`, `Description`, `CategoryId`); `ImportPreviewRow.MatchedTransaction` | Done |
| Confirm | `ImportConfirmRow.ExistingTransactionId`; `ImportService.LinkEntry`; `ConfirmLookups.Entries`; `ImportTotals.Linked`; `ImportConfirmResponse.Linked` | Done. The link re-checks the account, `Source == Manual`, no `ImportRef`, no transfer account and `ManualEntry.Fits`, then sets `ImportRef` and `Source = Imported`. Linked rows need no rate preload. The audit summary counts "entries linked", and a confirm that only links still writes it |
| Error code | `ErrorCodes.ImportEntryMismatch` (`import.entryMismatch`) | Done, with English and Lithuanian text under `serverErrors.import.entryMismatch` |
| Endpoint summaries | `ImportPreviewSummary`, `ImportConfirmSummary` | Done |
| Generated client | `frontend/openapi.json`, `api/generated/model/importMatchedTransaction.ts`, `importPreviewRow.ts`, `importConfirmRow.ts`, `importConfirmResponse.ts`, `errorCode.ts`, the zod schemas | Done: `just gen` has been run on the current contract |
| Review state | `preview-rows.ts`: `PreviewRowState.existingTransactionId`, `takesCategory`, and `toPreviewRows`, which preselects a matched row and clears its suggested transfer account | Done |
| Row | `import-row.tsx`: "Matches your entry" `HintTag` with `imports.matchedHint`; category shows the entry's category and is disabled; tags disabled; unusual mark hidden while linked | Done |
| Picker | `import-transfer-picker.tsx`: "Your entry of {date}" option (`imports.linkEntry`), switching clears the transfer fields and back | Done |
| Statement bar | `import-statement-bar.tsx` leaves linked rows out of the balance check, because the ledger balance already holds them | Done |
| Confirm and result | `import-section.tsx` sends `existingTransactionId`; the toast `imports.confirmed` and `ImportResultLine` show `linked` (`imports.resultLinked_*`) | Done, in both locales with Lithuanian plural forms |
| Tests | `backend/JxFinance.Tests/Unit/ManualEntryMatcherTests.cs`; three integration tests in `Integration/Imports/ImportEndpointTests.cs` (offered and linked, one entry cannot take two bank rows, another amount is refused); `preview-rows.test.ts` case for matched and duplicate rows | Done |
| Stories | `import-preview-table.stories.tsx` matched rows, `import-transfer-picker.stories.tsx` `LinkedToEntry`, `import-result.stories.tsx` `WithLinkedEntries` | Done |
| Docs | `docs/features/bank-statement-import.md` ("Entries you already made by hand", the sequence diagram, Needs attention); the 2026-09-28 Log entry and Current in `docs/decisions/swedbank-csv-import.md`; the import paragraph in `docs/api.md`; the Bank statement import clause in `docs/scope.md`; the backlog gap and idea rows removed and a Done row added in `docs/backlog.md` | Done |

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| What matches | Same account, same flow type, same amount and currency, dates at most three days apart, only rows entered by hand (`Source == Manual`) that carry no `ImportRef` | A fuzzy amount (within 1%), or comparing the description | People type the amount off the receipt, so it is exact; the date is what drifts, because card payments book a day or two later. Hand-typed text never equals bank text, so comparing it would miss most matches |
| Which entry wins | Closest date first, then file order; each entry goes to at most one bank row | Offering every candidate in a list | Two equal coffees in one week are the common tie, and the closest date is almost always right. The picker still lets the user decline it |
| What the link keeps | The hand-entered row keeps its date, category, tags, description and splits. Only `ImportRef` and `Source` change | Overwriting with the bank's date and text | The user's own fields are the reason they typed it in. The bank row adds only the proof that it happened |
| Default | A matched row starts selected and linked, even when it looks like a transfer | Starting unselected like suspected transfers | A three-day exact-amount match on a hand-entered row is strong evidence. Importing it as a new row is the mistake this feature exists to stop |
| Rows that qualify | Rows from the manual form, recurring-entry confirmations and conversion fees (all `Source == Manual`) | Only rows created in the transaction form | All three are real movements a bank will report. Nothing reads `Source` for fees or bills, so marking them imported changes nothing else |
| Confirm check | Confirm re-checks the entry and answers `import.entryMismatch` for the whole request when it no longer fits, is on another account, or is already linked | Silently importing the row instead | Like every other confirm error, nothing of the request is written; the user previews again |
| Unlinking | Not offered | An "Unlink" action in the ledger | Deleting the row and importing again does the same. It can be added if a real month shows the need |

## Data model

None. The link is the existing `Transaction.ImportRef` and `Transaction.Source`, so the unique account/import-reference index already stops a second link.

## Backend steps

1. **Review the working tree.** Read `ManualMatchesAsync` and `LinkEntry` once more against the rules above. Keep them as they are unless a test fails.
2. **Audit test.** On a household-shared account, a confirm that links one row and imports another writes exactly one `AuditEvents` row, whose label counts one entry and one entry linked and whose `Count` is 2, and no per-transaction "updated" row. `AuditTrail.Summarise` replaces the collected rows, so this should already hold; the test proves it.
3. **Run checks.** `just check-fast`, then `just test` with a wall-clock timeout. If a contract change is still pending, run `just gen` and commit the regenerated files with the rest.

## Frontend steps

1. **End-to-end step.** In `frontend/e2e/import.spec.ts`, enter one expense by hand with the amount of a row in the sample statement, two days earlier. Import the file and check three things: the row shows "Matches your entry", the result line says "1 linked", and the ledger holds one row with the hand-entered description. Run it only through `just e2e`.
2. **Stories.** Run `just test-stories` with a timeout, to cover the new stories' `play` functions and the axe scan.

## Tests

- **Unit:** already in place (`ManualEntryMatcherTests`, `preview-rows.test.ts`). Add one theory row to `ManualEntryMatcherTests` for exactly three days in the past, as well as in the future.
- **Integration:** the three in `ImportEndpointTests` are in place. Add these:
  - the shared-account audit row from backend step 2;
  - a camt.053 preview offers a match the same way, since the match runs after parsing and is format-neutral;
  - an imported transaction (`Source == Imported`) with the same amount and date is never offered.

## Docs

The feature page, decisions, API, scope and backlog are already updated (see "Done so far"). Left:

- `docs/user-flows.md`, Import bank data: one sentence saying that a row marked "Matches your entry" is linked to what you typed in, not added again.
- Once the tests above are in, run `just check-docs`. If the Done row's date is not the day it is committed, correct it.

## Open questions

None.
