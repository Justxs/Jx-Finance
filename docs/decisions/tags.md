# Tags: decisions

Related: feature page [Tags](../features/tags.md).

## Current

A second classifier beside the category, owned and shared exactly like one, with a name unique per owner ignoring case; many-to-many with the transaction and never with a split line; no feature switch; the ledger filter means every chosen tag; the report breaks expenses down by tag with untagged spending as its own group; both exports carry a tag column; deleting a tag takes it off its transactions and changes nothing else

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** Tags sit on the `Transaction` through a `TransactionTag` join row and never on a `TransactionLine`
  - Rejected: Letting a split line carry its own tags as well; putting tags only on lines and deriving the transaction's set
  - Why: A split divides one payment between categories; the payment is still one trip to one shop, so the thing a tag names does not split with it. Tags on both ends would let a tag on the parent and the same tag on a line count the same money twice in the breakdown, and the breakdown would have to prorate `ReportingAmount` per line per tag the way `ICategoryAttributionService` does for categories. Keeping them on the transaction makes a tag total a plain sum over whole rows, lets the bulk operation accept split rows that `bulk-category` must refuse, and keeps the ledger filter one `EXISTS` instead of two
- **2026-09-20.** Several tags in the ledger filter mean **all** of them; each one becomes an `EXISTS` subquery inside the existing `Filtered` method, capped at ten
  - Rejected: Any of them (OR); a mode parameter offering both
  - Why: Tags stack as narrowing facets — "holiday and reimbursable" is the question a household asks — and every other filter on the page narrows, so an OR would make one control behave backwards. An OR is still reachable by filtering one tag at a time; an AND cannot be expressed any other way. A mode parameter doubles the URL surface, the summary endpoint, both export links and the tests for a choice nobody made twice
- **2026-09-20.** The tag filter travels as one comma-separated `tagIds` query parameter typed as a string, validated by a shared `TransactionFilterValidator` that answers `text.invalidFormat`
  - Rejected: A repeated `tagIds` key with `IReadOnlyList<Guid>` on the request; ignoring unparsable ids silently
  - Why: The generated client builds a query string with `String(value)`, which joins an array with commas anyway, so a repeated key would have needed a hand-written URL builder for the list, the summary and both export links — and the CSV and PDF links are plain browser navigations built by `buildExportUrl`, not client calls. Declaring a string describes what actually goes over the wire. Silently dropping a bad id would answer a wider list than the caller asked for, which is the one failure mode a filter must not have
- **2026-09-20.** Tags get no entry in `Feature` or `FeatureGateMiddleware`
  - Rejected: Adding a `Tags` switch beside `Budgets` and `Goals`
  - Why: A switch hides routes, and tags are an attribute of a transaction rather than a screen of their own: `GET /api/transactions` would still answer `tagIds`, the two exports would still need a column decision, and the report would need a second shape. A household that turned it off would keep rows it could no longer read or clear. Categories, the closest thing in the product, have no switch for the same reason
- **2026-09-20.** A tag name is unique per owner, compared case-insensitively in `TagService` (409 `conflict.duplicate`) and backed by a unique index on (UserId, Name) filtered to `IsDeleted = false`
  - Rejected: Unique per household as well; a case-sensitive rule only; no index at all
  - Why: The rule protects one person's list from two entries they cannot tell apart, which is an owner-level problem; two members of a household naming their own tag "Holiday" is not a conflict, and their tags are separate rows with separate owners. A case-sensitive rule would let "Holiday" and "holiday" coexist in one list, which is exactly the confusion the rule exists to prevent. The index cannot express the case-insensitive rule without a computed column, so it is the race guard rather than the rule; filtering it on `IsDeleted` is what frees a name again after a delete
- **2026-09-20.** The report's tag breakdown covers expenses only and adds one entry with `tagId` null for untagged spending; the entries may sum to more than the total
  - Rejected: An income breakdown by tag as well; leaving the untagged rest out; scaling the amounts so the list adds up
  - Why: Tags in practice mark spending themes and the untagged group the feature needs is about spending, while income is already answered well by `incomeByCategory`; a second list doubles the page for little. Leaving the untagged rest out would hide the part of the month nobody has classified, which is the number that tells you whether the tags are worth anything. Scaling would invent figures: a receipt that is both the holiday and reimbursable really is both, and the honest answer is to say so in a line under the list
