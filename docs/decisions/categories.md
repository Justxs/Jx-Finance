# Categories: decisions

Related: feature page [Categories](../features/categories.md).

## Current

A category may sit in one group: `ParentId` names a top-level category of the same flow type, and nesting goes one level deep. The ledger's category filter, a budget on the parent and the category breakdowns of the reports and the dashboard include the sub-categories; the API keeps answering breakdowns per category with the parent named on each item, and the page rolls them up.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-30.** Category groups are one level of `ParentId` on the category itself, and breakdowns stay per category with `parentId`, `parentName` and `parentIcon` on each item, rolled up by the client. Decided while the owner was away, to be reviewed
  - Rejected: A separate group entity that categories join; any depth of nesting; answering the breakdowns already grouped by parent
  - Why: A group is a category people already file transactions under ("Transport" for a bus ticket), so a second entity would need its own budgets, filters and icons. One level answers "all Transport" and keeps every rollup a single lookup of the parent instead of a walk up a tree. Per-category breakdowns keep the month-end movers, the digest and the per-category comparison exact, and the client needs only the parent's name to merge rows, which the builder has at hand
