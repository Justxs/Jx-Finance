# Transaction groups: decisions

Related: feature page [Transaction groups](../features/transaction-groups.md); architecture [Ledger items and groups](../architecture/transactions.md#ledger-items-and-groups).

## Current

**Meaning.** A group is a ledger presentation. Its members keep their own category, date, account and amount in reports, budgets, balances, the month close, the exports and the journal; nothing but the ledger page and the group routes reads `GroupId`. There is no feature switch.

**Ledger.** `GET /api/transactions/ledger` answers flat items with a `kind` of `transaction` or `group`, paged and sorted in SQL over a union of ungrouped transactions and the groups the caller can see with a matching member. A group sorts by its newest matching member, the size of its net, or its name, and after every transaction for category and account. The pager counts items and the totals line counts transactions. A group's dates, `matchingCount` and net count the members that match the filter, and `memberCount` counts them all; an expanded group's members come unpaged from `GET /api/transaction-groups/{id}/members`, cut at 200 with `truncated`. A transaction names its `groupId` only when the caller can see the group, and a `GroupId` that points at a deleted group counts as none. `GET /api/transactions` is unchanged. A group folds rows into one; a tag filters.

**Writes.** Since 2026-10-02 the import review can put the rows it imports in a new or an existing group within the confirm. Membership is written with `ExecuteUpdateAsync` on `GroupId` alone, so `UpdatedAt` stays and a closed month does not drift. A row is in at most one group, and moving it means taking it out first. A group may start with one row, from the row's Add to group… menu, and keeps its name with one member or none; names are not unique and hold at most 120 characters. Ungroup goes to the trash and records its members; only the owner ungroups. The group routes are readable with a personal API token and writable only from the browser session.

**Sharing.** Since 2026-10-02 a group is personal or shared with one household, like a goal or a tag. A personal group holds only rows its owner entered. A shared group holds rows on accounts shared with its household, whoever entered them; every member of the household sees it fold in their ledger, can add a row they see on such an account and can take any row out. Any member renames it; only the owner changes its sharing, ungroups it or restores it. Making it personal again takes out the rows other people entered. Its create, rename and membership changes reach the household's activity log, the membership ones as one summarising row each. It belongs to its owner's member export.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/transaction-groups.md`).

- **2026-10-02.** The import review can put the rows it imports in a group, a new one by name or an existing one, carried in the confirm request as `group` and applied by `ImportConfirmService` through `ITransactionGroupService` in the same database transaction as the rows. This supersedes the 2026-10-01 entry that left grouping to the ledger
  - Rejected: Grouping afterwards in the ledger; a follow-up call from the browser after the confirm answers
  - Why: The owner asked for it: a statement often holds a whole trip, and the review is where those rows are already in view. Inside the confirm a refused group rolls the import back, while a follow-up call could leave the rows imported and ungrouped and would need the new transaction ids sent back to the browser
- **2026-10-02.** Decided while the owner was away, to be reviewed. Every row the confirm writes as a transaction and every row it links to a hand-entered entry joins the group; transfers and skipped duplicates do not. A new group takes the account's sharing, and a group the rows cannot join refuses the whole import
  - Rejected: A group checkbox per row; asking for the sharing of a new group in the review; skipping the rows the group refuses
  - Why: The review's selection already says which rows the user wants, and the rows that are not written as transactions cannot be members. All rows of one import sit on one account, so the account's sharing is the one that always fits them, and the owner can change it later from the ledger. Importing some rows and grouping fewer would be a result nobody asked for
- **2026-10-02.** A group can be shared with a household: `TransactionGroup` is `IShareable`, with `SharingFields` in the group dialog, the shared tag on the group row, a line in `ShareableSet.All` and the sharing guard. This supersedes the 2026-10-01 entry that kept groups personal
  - Rejected: Keeping groups personal; a household-scoped group that belongs to the household rather than to a member
  - Why: The owner asked for a household to share a group, such as a joint holiday paid from the shared card and a personal one. Using the shareable pattern gives the group the filter, the guard, member removal, household deletion and restore that every other shared record already has, without a second kind of sharing
- **2026-10-02.** Decided while the owner was away, to be reviewed. A shared group takes rows on accounts shared with its household, whoever entered them; a row on a personal account or on another household's account answers 400 `household.referenceNotShared`. A personal group still takes only the rows its owner entered and answers 403 `access.forbidden` otherwise
  - Rejected: Only rows the adder entered, even in a shared group; any row the adder can see; a new error code for the personal case
  - Why: The point of sharing a trip is that both people's card lines fold into it, and the rows of a shared account are already visible to every member. A row on a personal account would show in the group for its owner only, so its net and dates would differ between members. The personal rule keeps the reason of the 2026-10-01 entry: my group id on a housemate's row would clash with their own grouping. `access.forbidden` already says this and the existing tests expect it
- **2026-10-02.** Decided while the owner was away, to be reviewed. Any member who can see a shared group can add, take out and rename; only the owner changes its sharing, ungroups it and restores it from the trash
  - Rejected: Owner-only membership writes; any member ungroups
  - Why: It is the rule of a shared category and tag: a member edits, the owner deletes. Ungroup is a delete that goes to the owner's trash, so only the owner could undo it
- **2026-10-02.** Decided while the owner was away, to be reviewed. Sharing a group, or moving it to another household, is refused with `household.referenceNotShared` while a member sits on an account not shared with that household; making a shared group personal takes out the rows other people entered and keeps the owner's
  - Rejected: Taking out the rows that do not fit when sharing; refusing to make a group personal while it holds other people's rows
  - Why: Sharing should not silently shrink a group the owner built, and the error names what to fix. Unsharing must always be possible for the owner, and a personal group cannot hold someone else's row
- **2026-10-02.** Decided while the owner was away, to be reviewed. A row counts as taken by another group when that group is visible to the caller or belongs to the person who entered the row; a stale group of someone else, left behind when a household was deleted or its owner removed, does not block the row
  - Rejected: Any live group blocks the row; only a visible group blocks it
  - Why: With only visible groups counting, a housemate could pull my row out of my personal group without either of us seeing it. With every live group counting, a row in the group of a former member that no one can see any more could never be grouped again
- **2026-10-02.** Decided while the owner was away, to be reviewed. A shared group's create is one summarising activity row, "Trip to Riga, 14 transactions"; adding and taking out rows are one row each, "Trip to Riga, 3 transactions added"; a rename, a share and an unshare are logged by the change tracker like a shared tag
  - Rejected: No activity rows for group membership, as the 2026-10-01 entry had it for personal groups; one row per member
  - Why: Membership is written with `ExecuteUpdateAsync`, which the change tracker never sees, so a shared group would otherwise change for everyone without a trace. One row per member would flood the log with what is one action. `AuditTrail.Summarise` gained a household argument so the row lands in the group's household even when its members sit on no account of the save
- **2026-10-02.** Decided while the owner was away, to be reviewed. A shared group belongs to its owner's member export, and an import brings it back personal like every other shared record; a row on the owner's account in a housemate's group comes back in no group
  - Rejected: Exporting a shared group with every member who added a row
  - Why: The member export carries what the member owns. The import already clears `HouseholdId`, resets `Scope` and repairs a `GroupId` that points outside the file, so nothing new was needed
- **2026-10-01.** Groups were built now, although the plan was gated on the daily-use trial showing at least three events a month that tags and splits did not cover
  - Rejected: Waiting for the gate; dropping the plan
  - Why: The owner asked for the feature to be built and waived the gate. The risk the gate guarded against is a feature nobody uses, which costs one table, one column and one endpoint; reports, budgets and balances do not read it
