# Plan: Rule suggestions from history

Status: planned 2026-09-28. Size S. Needs nothing else first. When [Spending by payee](spending-by-payee.md) has landed, read its stored `Transaction.PayeeKey` instead of normalizing descriptions in memory; nothing else changes. Build this before [Machine-learned categorization](machine-learned-categorization.md), because a rule the user accepted here is the explicit answer the learned model must stay behind.

## Outcome

- After you file the third MAXIMA row as Groceries by hand, a toast asks "Always categorize descriptions starting with "MAXIMA" as Groceries?" with **Create rule** and **Don't ask again**. Closing the toast does neither.
- The toast appears once, at the save that reaches the third row. Later saves of the same payee stay quiet.
- The Rules tab lists every open suggestion above the rules, with how many rows back it up. **Review** opens the ordinary rule form filled in, so the pattern, the account or the amount range can be changed before saving. **Dismiss** removes it.
- A dismissed suggestion never comes back, on any device.
- A created rule is an ordinary rule: it goes last, suggests in the import preview and runs over old rows only through **Run over existing transactions**.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Grouping key | `SubscriptionDescription.Normalize(Description)`, the key unusual amounts and subscription detection already group by | The trimmed, lowercased description the import recall uses | Reference numbers and dates change on every card line; the recall's exact text would rarely reach three |
| Evidence | At least three of the caller's unsplit, non-deleted rows dated in the last 12 months share the key and the category, and no row with that key in the same window carries a different category of the same flow type | A majority vote; any three rows over all time | "Always" is only honest when the history never disagreed. Twelve months matches the unusual-amount look-back |
| "By hand" | A row counts only when none of the caller's current rules matches it (`RuleMatcher.Matches`) | A new `CategorySource` column set by every write path | Nothing records how a category was set, and old rows cannot be told apart. A row a rule already matches needs no new rule, so the check says what matters |
| Whose rows | Rows the caller created (`Transaction.UserId`), on any account they can see | Every visible row, a housemate's included | The toast says "you filed this three times", which must be true of you. Rules are personal (decision of 2026-09-20) |
| Pattern | `RulePatternFinder` takes the evidence rows' raw descriptions. First choice: their longest common prefix, ignoring case, cut back to a word end, at least 3 characters, as `StartsWith`. Otherwise: the longest key word of at least 3 letters that every description contains, as `Contains`. Otherwise no suggestion. The result must match every evidence row and no row of another category in the look-back, both checked with `RuleMatcher.Matches` | `Exact` on the normalized key; a new `DescriptionMatch.Normalized` | A rule matches raw text, so a normalized key would never fire. A new match kind changes rule evaluation, the tester and the run for one helper |
| Name | The pattern as it appears in the newest evidence row, cut to `RuleLimits.NameMaxLength` | Asking for a name | One click must be enough; the name can be edited later |
| When computed | On read, in memory, from one query capped at `UnusualAmountService.MaxHistoryRows` rows | A table filled by a job | Always current, nothing to invalidate, and cheap for a household |
| When the toast shows | After a save that set or changed the category, the client asks `GET /api/categorization-rules/suggested?transactionId=`. The server answers only when that row is evidence and the evidence count is exactly the threshold | Every save after the third; remembering "already offered" per browser | Exactly-at-threshold gives "once" with no extra state. Missed toasts are not lost: the Rules tab lists them |
| Dismissal | A server row `SuggestedRuleDismissal` (owner, key, category), like `SubscriptionDismissal` | A TanStack DB local-storage collection | The Rules tab list is computed on the server and must agree on every device. The dismissal pattern already exists |
| Creating | The toast's **Create rule** posts the suggested body to `POST /api/categorization-rules` unchanged. **Review** on the Rules tab opens `RuleForm` filled in and submits through the same mutation | An "accept suggestion" endpoint | One write path, so validation, the 100-rule limit, ordering and trash stay as they are |
| Switch | Part of `CategorizationRules`; the endpoints sit in its group | A switch of its own | It is a helper of rules and has no meaning without them |

## Data model

| Change | Detail |
| --- | --- |
| `SuggestedRuleDismissal` | `OwnableEntity` with `SuggestedRuleDismissalId`, `Key` (max `SubscriptionDescription.MaxLength`) and `CategoryId`. Unique index on (UserId, Key, CategoryId) filtered by `DbSchema.NotDeletedFilter`, as in `SubscriptionDismissalConfiguration`. A deleted category is soft-deleted, so its dismissals simply stop mattering |
| Migration | `just migrate-add AddSuggestedRuleDismissals` |

## Backend steps

1. **Pure pattern finder.** `Common/CategorizationRules/RulePatternFinder.For(IReadOnlyList<string> descriptions, string key)` returns `(DescriptionMatch Match, string Pattern)?`. The constants go in one static class `SuggestedRules` next to it: `Threshold = 3`, `LookBackMonths = 12`, `MinimumPatternLength = 3`, `MaxSuggestions = 20`.
2. **Service.** `ISuggestedRuleService` and `SuggestedRuleService` in `Endpoints/CategorizationRules/Services`:
   - `GetAsync(Guid? transactionId)` reads, in one query, the caller's own unsplit rows of the last 12 months that have a description: id, account, type, amount, description, category.
   - It loads the caller's rules once, the same way `CategorizationRuleService.LoadAllAsync` does, and drops every row a rule matches. Categories come from `db.Categories`, as `CategoryTypesAsync` does.
   - It groups by key, applies the evidence rule, removes dismissed pairs and runs `RulePatternFinder`, checking the pattern against the rows of other categories.
   - It orders by evidence count, then by the newest date, and takes `MaxSuggestions`.
   - With a `transactionId`, it answers the one group holding that row, and only when its count equals `Threshold`.
   - It answers an empty list when the caller already has `RuleLimits.MaxRulesPerUser` rules.
3. **Response.** `SuggestedRuleResponse(string Key, string Name, DescriptionMatch Match, string Pattern, Guid CategoryId, int Evidence, DateOnly LastSeen)` in `Endpoints/CategorizationRules/Shared`. The name avoids the `RuleSuggestion` record the import preview already uses.
4. **Endpoints**, in `CategorizationRulesGroup`:
   - `GetSuggestedRules`: `GET /api/categorization-rules/suggested`, optional `transactionId`. An id the caller cannot see gets an empty list, not a 404.
   - `DismissSuggestedRule`: `POST /api/categorization-rules/suggested/dismiss` with `{ key, categoryId }`. It normalizes the key again, checks the category with `IReferenceGuard.CategoryExistsAsync` and answers 204. A second dismissal of the same pair is a no-op, as in `SubscriptionDetectionService.DismissAsync`.
5. **Summaries** describe the evidence rule, the exactly-at-threshold rule for `transactionId` and that nothing is written.
6. **Error codes:** none new. The key uses the shared required and max-length rules; the category uses the existing reference codes.
7. **Trash:** a dismissal is not a deletion and gets no trash entry, like a subscription dismissal.

## Frontend steps

1. `just gen`. In `src/api/invalidation.ts`, the dismiss mutation makes the suggested list stale. Create, update, bulk-category, bulk-tag, delete and import confirm do too, because each can add or remove evidence. Rule create, update and delete already invalidate the rules root; they also invalidate the suggested list.
2. **Toast.** `features/categorization-rules/suggested-rule-toast/use-suggested-rule-toast.ts` exposes `offerAfterSave(transactionId)`. It fetches the suggestion through the query client and shows a sonner toast in the undo pattern of `use-confirmed-delete.ts`: `action` is **Create rule**, which calls `useCreateCategorizationRule` and then toasts "Rule created"; `cancel` is **Don't ask again**, which calls the dismiss mutation. It is called from the `onSuccess` of the update in `use-transaction-mutations.ts` and of the category cell's single-row bulk-category, only when the category changed and the `categorizationRules` feature is on. It is also called from the create, when the new row has a category.
3. **Rules tab.** `features/categorization-rules/suggested-rules/suggested-rules.tsx` renders above the list in `rules-page.tsx`: one row per suggestion with the condition in words from `rule-summary.ts`, the category chip, "Based on 4 transactions", **Review** and **Dismiss**. It renders nothing when the list is empty, so an account with no suggestions sees the page as today.
4. **Form prefill.** `RuleForm` gains an optional `draft` prop with the create body's fields. The create dialog opened by **Review** passes it. Submit stays the ordinary create.
5. **Text.** English and Lithuanian keys under `categorizationRules.suggested.*`: the toast sentence for each match kind, the button labels and the evidence count with plural forms.
6. **Stories.** `suggested-rules` covers default, empty, pending, `failWith` and a `play` that dismisses a row. The fixture goes in `src/storybook/fixtures/categorization-rules.ts` and in `fixtures.contract.test.ts`.

## Tests

- **Unit:** `RulePatternFinder` theories: a common prefix cut back to a word end; card lines whose prefix differs, falling back to `Contains` on the shared word; a prefix shorter than 3 characters; no shared word, so no suggestion; the pattern really matches every input.
- **Integration**, in `Integration/CategorizationRules`:
  - Three hand-filed rows with the same key make one suggestion. Two make none.
  - One row with the same key in another category of the same type makes none; one in an income category does not block an expense suggestion.
  - Rows an existing rule matches do not count, so creating the suggested rule removes the suggestion.
  - A housemate's rows on a shared account do not count; the caller's own rows on that account do.
  - Split rows, deleted rows and rows older than 12 months do not count.
  - A dismissed pair stays hidden, and dismissing twice is fine.
  - `transactionId` answers at exactly three and not at four, and answers an empty list for a row the caller cannot see.
  - With 100 rules the list is empty. With the `CategorizationRules` switch off both routes answer `feature.disabled`.
- **Frontend:** a DOM test for the toast hook: create posts the suggested body unchanged, and "Don't ask again" dismisses.

## Docs

- `docs/features/categorization-rules.md`: a "Suggested rules" section with the evidence rule, the pattern choice, the once-only toast and dismissal.
- `docs/decisions/categorization-rules.md`: a dated Log entry for "by hand" meaning "no current rule matches it" and for the exactly-at-threshold toast; the Current line mentions suggestions.
- `docs/data-model.md` for `SuggestedRuleDismissal`, `docs/api.md` for the two routes, `docs/features/transactions.md` for the toast after a save.
- `docs/scope.md`, and `docs/backlog.md`, moving the row from New ideas to Done.

## Open questions

- Is three rows in twelve months right, or should a payee that shows up once a month need more?
- Should an import confirm that creates new evidence say "2 rule suggestions" with a link to the Rules tab, or is the tab enough?
