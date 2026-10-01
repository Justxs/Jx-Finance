# Learned categories: decisions

Related: feature page [Learned categories](../features/learned-categories.md); [Categorization rules](categorization-rules.md).

## Current

**Learned categories.** In scope as a suggestion-only multinomial naive Bayes model, written by hand in `Common/LearnedCategories`, trained per request inside the API from the categorized, unsplit, non-refund rows the caller can see in the last 24 months (at most 10,000) and thrown away with the request; nothing is stored, cached or sent anywhere. Features are the words of the stored `PayeeKey`, the whole key, the account and a log2 amount bucket; only categories of the row's flow type compete; a guess needs 0.80 confidence and a support of 3 rows sharing a word. A rule always wins, then the learned guess, then the import's recall. It suggests in the import review, as a chip in the transaction form and in a review of the Uncategorized ledger applied through `bulk-category` with `onlyUncategorized`, behind the `LearnedCategories` switch, off by default. The plan's evaluation gate was waived by the owner on 2026-10-01 and the evaluation on the owner's ledger is still to run before the switch is turned on.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-10-01.** Machine-learned categorization is in scope as a suggestion-only naive Bayes model, trained per request inside the API from the ledger the user can see, behind a `LearnedCategories` switch that is off by default, and built although the plan's hold-out evaluation on the owner's ledger could not be run: the owner waived the gate and asked for the whole feature. The constants are the plan's starting values (`MinimumConfidence` 0.80, `MinimumSupport` 3), not chosen by an evaluation; the only numbers are those of 2026-09-29 in [Categorization rules](categorization-rules.md), demo data on which the recall already fills every held-out row. Running `--evaluate-categorizer` on the owner's ledger once it holds six months and 1,500 categorized rows comes before the switch goes on, and is a release-work row in the backlog
  - Rejected: Keeping it deferred until the gate is measured, because rules and the recall cover the need; ML.NET; a hosted or local language model; a stored model refreshed by a job
  - Why: The owner chose to have the feature ready for the evaluation rather than build it afterwards, and the switch keeps it out of every installation until somebody turns it on. Naive Bayes over the normalized description, the account and an amount bucket needs no dependency, no outside call and nothing stored, trains in milliseconds and can be read and tested; ML.NET brings native parts and a model format nobody here can read, a language model sends or hosts the ledger, and a stored model can go stale, reach a backup and outlive a deleted row
- **2026-10-01.** The model learns from the rows the caller can see, a housemate's rows on a shared account included, but only those whose category the caller can see, and the active household narrows them
  - Rejected: Only the caller's own rows, as suggested rules use
  - Why: On a shared account the useful answer is how the household files it, and a visible row reveals nothing the caller could not open. A rule is a personal habit; a guess is only a suggestion the caller accepts or not. Requiring the category to be visible keeps a housemate's personal category from ever being offered
- **2026-10-01.** Refunds are neither trained on nor guessed for
  - Rejected: Training on refunds like any expense
  - Why: The plan predates refunds. The import files a refund in the category of the purchase it refunds through `refundCandidate`, and the evaluation and suggested rules already leave negative expenses out; a refund's amount bucket would be meaningless. The form shows no chip for a refund
- **2026-10-01.** The form suggestion is `POST /api/transactions/suggest-category`, browser-only, and the ledger review is `GET /api/transactions/uncategorized-suggestions`, token-readable like the other ledger reads; both carry `RequiresFeature(Feature.LearnedCategories)` on the endpoint
  - Rejected: A `GET` with the description in the query; letting a read-and-write token call the `POST`; gating them with `CategorizationRules`
  - Why: A description in a URL lands in access logs. The `POST` only reads and serves the form, so a script gains nothing from it. The switch is a choice an installation makes about guessing, which must work with rules turned off
- **2026-10-01.** A review answer carries the whole `TransactionResponse` rather than only the transaction id the plan named
  - Rejected: Ids only, with the dialog reading the rows from the ledger
  - Why: The ledger page holds one page of rows, while the review covers up to 200; the dialog needs each row's date, payee or description and amount, and the transaction response already carries them with the switches applied
- **2026-10-01.** The review applies through `POST /api/transactions/bulk-category`, which gains `onlyUncategorized`
  - Rejected: A new write endpoint; writing on the suggestion call
  - Why: One write path keeps the type checks, the audit summary and the invalidation of the ledger in one place. The flag keeps the promise that a guess never replaces a category somebody chose between the review and the apply
