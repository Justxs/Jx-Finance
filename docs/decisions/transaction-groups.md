# Transaction groups: decisions

Related: feature page [Transaction groups](../features/transaction-groups.md); architecture [Ledger items and groups](../architecture/transactions.md#ledger-items-and-groups).

## Current

**Meaning.** A group is a ledger presentation. Its members keep their own category, date, account and amount in reports, budgets, balances, the month close, the exports and the journal; nothing but the ledger page and the group routes reads `GroupId`. There is no feature switch.

**Ledger.** `GET /api/transactions/ledger` answers flat items with a `kind` of `transaction` or `group`, paged and sorted in SQL over a union of ungrouped transactions and the groups the caller can see with a matching member. A group sorts by its newest matching member, the size of its net, or its name, and after every transaction for category and account. The pager counts items and the totals line counts transactions. `GET /api/transactions` is unchanged.

**Writes.** Membership is written with `ExecuteUpdateAsync` on `GroupId` alone, so `UpdatedAt` stays and a closed month does not drift. A row is in at most one group. A group may start with one row and keeps its name with one member or none. Ungroup goes to the trash and records its members; only the owner ungroups. The group routes are readable with a personal API token and writable only from the browser session.

**Sharing.** Since 2026-10-02 a group is personal or shared with one household, like a goal or a tag. A personal group holds only rows its owner entered. A shared group holds rows on accounts shared with its household, whoever entered them; every member of the household sees it fold in their ledger, can add a row they see on such an account and can take any row out. Any member renames it; only the owner changes its sharing, ungroups it or restores it. Making it personal again takes out the rows other people entered. Its create, rename and membership changes reach the household's activity log, the membership ones as one summarising row each. It belongs to its owner's member export.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

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
- **2026-10-01.** A group can be started from one row, through a row's Add to group… → New group; the selection toolbar still offers Group only for two or more rows
  - Rejected: The plan's minimum of two rows on `POST /api/transaction-groups`; offering only existing groups from a row
  - Why: The plan also asks the row action, on the desktop and the phone, to offer a new group, and the phone has no selection, so with a minimum of two a phone could never start a group and neither could a pair of split rows. A one-row group is already a state the plan accepts, since a group keeps its name when it drops to one member
- **2026-10-01.** The group routes are token-readable and not token-writable
  - Rejected: Adding create, add, remove, rename and ungroup to the token-writable list
  - Why: A token writes what a script records, such as a payment from a shortcut; grouping is reading the ledger, done by a person on the page. `TokenWritableTests` lists `/api/transaction-groups` among the prefixes that may never be writable, so a later change has to be deliberate
- **2026-10-01.** A group's date range, `matchingCount` and net count the members that match the ledger's filter, and `memberCount` counts them all
  - Rejected: Dates and net of every member whatever the filter
  - Why: The sort keys are computed over the matching members, so showing the whole group's net while sorting by the matching part would put a row out of order with its own figure, and the matching part is what agrees with the totals line above the table. Without a filter the two are the same
- **2026-10-01.** A transaction response names `groupId` only when the caller can see the group; a member trashed while grouped keeps its `GroupId`, and a `GroupId` that points at a deleted group counts as none
  - Rejected: Answering the stored `GroupId` to everyone; clearing `GroupId` on the trashed members at ungroup
  - Why: A housemate would otherwise learn the id of a personal group and the frontend would offer them Remove from group. Keeping the id on a trashed member is what lets it come back into its group, and the visibility clause makes the stale id harmless once the group is gone; the retention purge's `ON DELETE SET NULL` clears it for good
- **2026-10-01.** The members of an expanded group come from `GET /api/transaction-groups/{id}/members` with the ledger's filters, unpaged, cut at 200 with a `truncated` flag
  - Rejected: Paging the members; reusing `GET /api/transactions` with a group filter
  - Why: A group holds a trip or a renovation, tens of rows, so paging inside an expanded row would add a second pager for nothing. A group filter on the list would put a group concept into the endpoint every other reader shares
- **2026-10-01.** A group is a ledger presentation; its members keep their own category, date and amount everywhere else
  - Rejected: Lunch Money's model, where the group takes one category and hides its members from reports
  - Why: A category that overrides its members would be a third way of attributing spending next to categories and split lines, and every read path in `CategoryAttributionService` would need it. Splits already cover "one payment, many categories" and refunds cover "money back"
- **2026-10-01.** A group folds rows into one; a tag filters
  - Rejected: Only documenting "use a tag and the ledger total"
  - Why: The tag filter plus the ledger's summary already gives the net of a set of rows. What a tag cannot do is fold 14 card lines into one row between the others
- **2026-10-01.** A new `GET /api/transactions/ledger` returns a flat `LedgerItemResponse` with a `kind` and nullable `transaction` and `group` parts; `GET /api/transactions` is unchanged
  - Rejected: Changing `GET /api/transactions` to return mixed items; a polymorphic `oneOf` response
  - Why: The recent-transactions card, the import review and the optimistic updates read the existing list, and none of them should see groups. The contract has no polymorphic response anywhere, while `AccountMovementRow` already uses a `Kind` enum on a flat record
- **2026-10-01.** Paging is a SQL `Concat` of two projections, paged before the page's rows and groups are loaded
  - Rejected: Collapsing on the client within a page
  - Why: Members of one group can fall on two pages under any sort, so a client-side collapse would show a group twice or with a partial net
- **2026-10-01.** A group sorts by its newest matching member's date, the absolute net, and its name; for category and account it follows all transactions in either direction
  - Rejected: Its earliest date; a signed net; mixing groups into the category order
  - Why: The newest date is where a reader looks for recent activity. Sorting by the absolute value keeps the existing amount order meaningful. A group has no category or account, and a separate `Kind` key leaves the existing order of uncategorized rows untouched
- **2026-10-01.** The pager counts ledger items; the totals line still counts transactions
  - Rejected: One count
  - Why: They answer different questions: how many lines to page through, and how many rows match
- **2026-10-01, superseded on 2026-10-02.** Groups are personal, `TransactionGroup : OwnableEntity`, and members must have `UserId == caller`. A group can now be shared with a household; see the 2026-10-02 entries above
  - Rejected: Groups over any visible row; shareable groups
  - Why: A group over a housemate's row would put my group id on their row. That clashes with their own grouping, and it would leak into their member export. Month closes and saved filters are personal for the same reason
- **2026-10-01.** A group left with one live member still shows as a group, and one with none shows nothing
  - Rejected: Deleting the group when it drops below two
  - Why: Deleting behind the user's back would lose the name, and a restored member would come back without it
- **2026-10-01.** No feature switch
  - Rejected: A `TransactionGroups` switch
  - Why: Like tags, a group is a way of reading ledger rows, not a page of its own
- **2026-10-01.** Membership writes are `ExecuteUpdateAsync` on `GroupId` alone, leaving `UpdatedAt` untouched, like the bulk tag writes
  - Rejected: Setting `GroupId` through the change tracker
  - Why: The tracker stamps `UpdatedAt`, and month-close drift would then report every grouped row of a closed month as edited, although no figure changed
- **2026-10-01.** A row is in at most one group; moving it means removing it first
  - Rejected: Moving silently on add
  - Why: A silent move would empty another group behind the user's back
- **2026-10-01.** Names are not unique, at most 120 characters
  - Rejected: A unique name per owner
  - Why: Two trips to Riga in different years are two groups with the same honest name, and the dialog lists them with their dates
- **2026-10-01.** Rows are grouped afterwards in the ledger, not in the import review
  - Rejected: Grouping from the import review
  - Why: The review already carries categories, tags, transfers and refunds. Grouping a statement's rows afterwards takes one selection
