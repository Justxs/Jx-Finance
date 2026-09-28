# Plan: Machine-learned categorization

Status: planned 2026-09-28. Size L. This reopens a deferred item. The backlog and `docs/decisions/general.md` keep it out of scope because rules and the import's recall of the last category cover the need. Do not start before the daily-use trial in the backlog has produced at least six months of real categorized rows, and build it after [Rule suggestions from history](rule-suggestions.md), which turns the repeated payees into rules first. If [Spending by payee](spending-by-payee.md) has landed, read its `PayeeKey` column instead of normalizing in memory. Backend step 2, the evaluation, is a gate: if it fails on the owner's ledger, the rest is not built and the item goes back to deferred with the numbers recorded.

## Outcome

- In the import preview, a row that no rule fills gets a category guessed from your own history, marked "Learned", with a tooltip such as "From your history, 93% sure". Where the model is not sure enough, the old recall still answers, and below that nothing is filled.
- In the transaction form, after you type a description and leave the field with no category chosen, a chip under the category offers one: "Suggested: Groceries". It names the rule when a rule gives it. One click sets the field; nothing is set on its own.
- In the ledger, with the Uncategorized filter on, **Suggest categories** lists up to 200 of the filtered rows grouped by suggested category. You tick the groups you agree with and apply them through bulk recategorize, which touches only rows that are still uncategorized.
- A rule always wins over a learned guess. A guess never replaces a category somebody chose.
- The model is trained inside the API from the ledger you can see, per request, and nothing leaves the installation.
- An administrator can run `--evaluate-categorizer <email>` in the container and read how accurate it is on that user's ledger.
- It is behind a new `LearnedCategories` switch, off by default.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Reopening the scope | Plan it, but ship only through the evaluation gate below | Keep it deferred without measuring | Rules cover payees whose text is stable. The recall covers exact repeats among the newest 200 rows. What is left is the long tail: a new branch of a known chain, card lines whose terminal or city changes, a payee last seen a year ago. Nobody knows how big that tail is on a real ledger, so the gate measures it before any UI is built |
| Model | Multinomial naive Bayes with Laplace smoothing, written by hand in `Common/LearnedCategories`, about 150 lines | ML.NET (`Microsoft.ML`); nearest neighbours through PostgreSQL `pg_trgm`; a language model or any hosted API | ML.NET brings a large package with native parts into the container and a model format nobody here can read, for no measured gain at a few thousand rows. `pg_trgm` is an extension to install and a text lookup, not something learned. A hosted model sends the ledger out of the house. Naive Bayes is word counts: it trains in milliseconds, is deterministic, is easy to test with theories and can say which words decided |
| Features | The words of `SubscriptionDescription.Normalize(Description)` of two or more characters; the whole normalized key as one extra token; `account:<id>`; an amount bucket `amount:<n>` where `n` is `floor(log2(Amount))`, capped at 20 | Word pairs, the weekday, tags | The whole-key token carries what the recall knows. The words carry the partial matches the recall misses. The account and the amount only matter when history says so, such as a small Maxima snack against the weekly shop. More features need more data than a household has |
| Flow type | A filter, not a feature: only categories of the row's type compete, as with rules | A feature like the others | An income row must never get an expense category, whatever the words say |
| Training rows | Unsplit, categorized rows the caller can see through `db.Transactions`, the active household included, from the last 24 months, newest 10,000; only categories visible through `db.Categories` | Only the caller's own rows; the whole history | On a shared account the useful answer is how the household files it. A visible row reveals nothing the caller could not open anyway. The date and count caps bound the one query |
| When it trains, where it lives | Per request, in memory, and thrown away with the request. Nothing is stored | A `jsonb` row per user refreshed by a job; `IMemoryCache` keyed by user and a ledger fingerprint | A model that exists only for one request is never stale, needs no invalidation, never reaches a backup and never outlives a deleted row. The evaluation times it; a cache is the first fallback if the time target fails |
| Confidence | The posterior of the best category, normalized over the competing categories. A guess is shown only when it is at least `MinimumConfidence` (start at 0.80) and the best category has at least `MinimumSupport` (start at 3) training rows sharing a word with the row | Always showing the best guess | Naive Bayes is overconfident, so the threshold is tuned on the evaluation, not trusted. The support floor stops a guess made from the account and the amount alone |
| Order | Rule, then learned, then recall | Learned before rules; dropping the recall | A rule is an explicit statement (decision of 2026-09-20). The recall stays for rows where the model abstains, until the evaluation shows the model is never worse than it |
| Import preview | A learned guess fills the row's initial category like the recall does today, with its own "Learned" mark, and any change clears it | Only showing a chip in the preview | The preview already fills its guesses before confirm. The weaker recall must not do more than the better guess |
| Ledger apply | Through `POST /api/transactions/bulk-category`, which gains `onlyUncategorized` | A new write endpoint; writing on the suggestion call | One write path. The flag keeps the promise when somebody categorized a row between the review and the apply |
| Switch | `Feature.LearnedCategories`, off by default | Folding it into `CategorizationRules`; no switch | Guessing is a choice an installation should make. It has no screen of its own, and it must work with rules turned off |
| Privacy | Nothing leaves the process: no outside call, no telemetry, the model is never stored or logged. The evaluation prints counts and percentages only, never a description or category name | | The product never connects out for ledger data, and this does not change that |
| Split lines | Not trained on and never suggested | Lines as training rows | A line's description is optional and usually empty, and the category of a split parent means nothing |

## Data model

| Change | Detail |
| --- | --- |
| `Feature.LearnedCategories` | Appended to `Feature`, `FeatureFlags` and the settings table with `HasDefaultValue(false)` |
| Migration | `just migrate-add AddLearnedCategoriesSwitch` |

No table for the model: it is computed per request.

## Backend steps

1. **Pure model.** In `Common/LearnedCategories`:
   - `CategoryFeatures.Of(string? description, AccountId accountId, decimal amount)` returns the tokens.
   - `CategoryModel.Train(IEnumerable<TrainingRow>)` and `Predict(IReadOnlyList<string> tokens, FlowType type)` return `LearnedGuess(CategoryId CategoryId, decimal Confidence, int Support)?`.
   - `TrainingRow(IReadOnlyList<string> Tokens, CategoryId CategoryId, FlowType Type)`.
   - The constants `MinimumConfidence`, `MinimumSupport`, `LookBackMonths = 24` and `MaxTrainingRows = 10000` live in `CategoryModel`.
   - Ties break by category id, so the same ledger always gives the same answer.
2. **Evaluation, the gate.** `Infrastructure/LearnedCategories/CategorizerEvaluationCommand`, started by `--evaluate-categorizer <email>` in `Program.cs` like `--seed-demo`.
   - It trains on rows dated before the last three months and predicts every categorized, unsplit row of the last three months.
   - It also replays what exists today: the user's current rules through `RuleMatcher`, and the recall (the newest earlier row with the same trimmed, lowercased description and type).
   - It prints the number of rows; coverage and precision for rules, the recall and the model; the model on the rows that neither a rule nor the recall fills; a precision and coverage table for thresholds from 0.60 to 0.95; and training and prediction times.
   - Run it on `just seed` data and on a restored copy of the owner's ledger. Record the numbers and the chosen constants in the decision entry. Stop here if the gate fails.
3. **Service.** `ILearnedCategoryService` and `LearnedCategoryService` in `Common/LearnedCategories`, scoped. `SuggestAsync(IReadOnlyList<LearnedCandidate>, CancellationToken)` runs one query for the training rows, trains and predicts. `LearnedCandidate(AccountId AccountId, FlowType Type, decimal Amount, string? Description)`. With the switch off it answers nulls without querying.
4. **Import preview.** `ImportService.PreviewAsync` calls it once for the rows that are not duplicates and got no category from a rule. `ImportPreviewRow` gains `LearnedCategoryId` and `LearnedConfidence`, both nullable.
5. **Form suggestion.** A `SuggestCategory` slice in `Endpoints/Transactions`: `POST /api/transactions/suggest-category` with `{ accountId, type, amount, description }`. It answers `CategorySuggestionResponse(Guid? CategoryId, CategorySuggestionSource? Source, string? RuleName, decimal? Confidence)`, where the source is `Rule` or `Learned`. The work goes in a new `CategorySuggestionService` in `Endpoints/Transactions/Services`. It asks `ICategorizationRuleService.SuggestAsync` first while that switch is on, then the learned service. The account is checked with `IReferenceGuard`. The endpoint carries `RequiresFeature(Feature.LearnedCategories)`, like `DismissUnusualAmountEndpoint`. It is a POST so that the description never lands in a URL or an access log.
6. **Ledger review.** A `GetUncategorizedSuggestions` slice: `GET /api/transactions/uncategorized-suggestions`. Its request derives from `TransactionFilterRequest`, like `GetTransactionsSummaryRequest`. The service forces the uncategorized and unsplit conditions and reads the newest `BulkRules.MaxTransactions` (200) rows. It sends them through `SuggestAsync` of the rules, grouped by account, and then through the learned service. It answers `UncategorizedSuggestionResponse(Guid TransactionId, Guid CategoryId, CategorySuggestionSource Source, string? RuleName, decimal? Confidence)`, only for rows that got an answer.
7. **Apply.** `BulkCategorizeTransactionsRequest` gains `OnlyUncategorized` (default false). When true, the update adds `CategoryId == null`, and `Updated` counts only the rows that changed.
8. **Switch.** `Feature`, `FeatureFlags`, the settings mapping and the defaults. With the switch off, the preview fields are null and both new endpoints answer `feature.disabled`.
9. **Error codes:** none new. The existing reference, text-length and `collection.invalidSize` codes cover the inputs.

## Frontend steps

1. `just gen`. `suggest-category` is a read done as a POST, so it goes in `mutationsWithoutInvalidation`. The uncategorized suggestions query is made stale by every transaction mutation.
2. **Import.** In `preview-rows.ts`, `toPreviewRows` picks rule, then learned, then `recallCategoryId`. `PreviewRowState` gains `learnedConfidence: number | null`. `import-row.tsx` shows a `HintTag` "Learned" with the confidence in its hint. Every existing change handler clears it, as it clears `categorySuggested`.
3. **Form.** `transaction-form.tsx`: the description field's `onBlur` calls the `useSuggestCategory` mutation when the category is empty, the row is not split and the switch is on. There is no effect: the call is the blur handler. A new `features/transactions/category-suggestion/category-suggestion.tsx` renders the chip under the category field. The chip reads "Suggested: Groceries", with "by rule Maxima" or "93% sure", and clicking it sets `categoryId`. It disappears when the category or the description changes.
4. **Ledger.** `transactions-toolbar.tsx` shows **Suggest categories** when the `uncategorized` search param is on and the switch is on. It opens a new `features/transactions/uncategorized-suggestions/uncategorized-suggestions-dialog.tsx`: one group per category with its count, a checkbox and the rows (date, description, amount) inside, rule-sourced groups labelled with the rule. **Apply** sends one `bulkCategory` call per ticked group with `onlyUncategorized: true` and toasts the total from the responses.
5. **Settings.** The switch in `features-fields.tsx`, the storybook settings fixture, and English and Lithuanian text for the switch, the mark, the chip, the dialog and the confidence sentence.
6. **Stories.** `category-suggestion` covers rule, learned and none. `uncategorized-suggestions-dialog` covers default, empty, pending, `failWith` and a `play` that ticks one group and applies. The import row story gains a learned row.

## Tests

- **Unit:**
  - `CategoryFeatures`: reference digits dropped, the whole-key token present, amount buckets at their edges.
  - `CategoryModel` theories: it learns a word; the account decides when the words tie; it abstains below the support floor and below the threshold; only categories of the row's type compete; confidences over the competitors sum to one; the tie-break is stable.
- **Integration:**
  - In `Integration/Imports`: the learned field is filled when no rule matches, null when a rule does, null for duplicates, and null with the switch off.
  - Sharing: a housemate's rows on a shared account train the caller's model; a housemate's personal category is never suggested; the active household narrows the training rows.
  - `suggest-category`: a rule beats the model, an unknown account is refused, and the switch off answers `feature.disabled`.
  - `uncategorized-suggestions`: at most 200 rows, never split or categorized rows, and the ledger filter narrows it.
  - `bulk-category` with `onlyUncategorized` skips a row categorized after the review.
  - The evaluation command on seeded data prints no seeded description or category name.
- **Frontend:** `preview-rows.test.ts` for the rule, learned, recall order and for clearing the mark on change.

## Docs

- A new `docs/features/learned-categories.md` with the model, the features, the constants chosen by the evaluation, the three places it appears and what it never does. Add a row to `docs/features/README.md`.
- A new `docs/decisions/learned-categories.md`. Its first Log entry reopens the scope:
  - **(date of shipping).** Machine-learned categorization is in scope as a suggestion-only naive Bayes model, trained per request inside the API from the ledger the user can see, behind a `LearnedCategories` switch that is off by default, and shipped because the hold-out evaluation on the owner's ledger passed (numbers recorded here)
    - Rejected: Keeping it deferred because rules and the recall cover the need; ML.NET; a hosted or local language model; a stored model refreshed by a job
    - Why: The evaluation measured how many rows neither a rule nor the recall fills and how often the model is right on them. Naive Bayes over the normalized description, the account and an amount bucket answers that with no dependency, no outside call and nothing stored
- `docs/decisions/general.md`: a Log entry pointing to it, and the "Release scope" Current line updated. The out-of-scope lists in `PRODUCT.md` and `docs/scope.md`, and the section 3 row of `docs/backlog.md`, drop the item.
- Updates to `docs/features/bank-statement-import.md` (the order rule, learned, recall), `docs/features/transactions.md` (the chip, the review and `onlyUncategorized`), `docs/features/categorization-rules.md` (rules win), `docs/features/installation-settings.md` (the switch), `docs/api.md` and `docs/data-model.md`.

## What must be true to ship

1. The owner's ledger holds at least six months and 1,500 categorized, unsplit rows.
2. On the last three months held out, at the chosen threshold, learned guesses on the rows that neither a rule nor the recall fills are right at least 90% of the time and cover at least 30% of those rows.
3. On the rows the recall fills, the model at that threshold is at least as precise as the recall. Otherwise the order becomes rule, recall, learned.
4. On the production host, with 10,000 training rows, training plus prediction for a 500-row preview takes under 150 ms, and the form suggestion takes under 100 ms at the 95th percentile. Otherwise add the in-memory cache first.
5. After a month of imports with the switch on, fewer than 1 in 20 accepted learned guesses were changed afterwards, counted by hand from the ledger.

If 2 or 3 fails, record the numbers in `docs/decisions/general.md`, keep the item deferred and delete the code of steps 1 and 2.

## Open questions

- Are 90% precision and 30% coverage the right gate for a household, or should precision be higher and coverage lower?
- Should the model learn from a housemate's categorizations on shared accounts, as planned, or only from the rows the caller entered, as rule suggestions do?
- Once the evaluation has run, should the switch default to on for new installations?
