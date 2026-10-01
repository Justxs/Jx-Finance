# Transaction groups: decisions

Related: feature page [Transaction groups](../features/transaction-groups.md); architecture [Ledger items and groups](../architecture/transactions.md#ledger-items-and-groups).

## Current

**Meaning.** A group is a ledger presentation. Its members keep their own category, date, account and amount in reports, budgets, balances, the month close, the exports and the journal; nothing but the ledger page and the group routes reads `GroupId`. Groups are personal and hold only rows their owner entered, and there is no feature switch.

**Ledger.** `GET /api/transactions/ledger` answers flat items with a `kind` of `transaction` or `group`, paged and sorted in SQL over a union of ungrouped transactions and the caller's groups with a matching member. A group sorts by its newest matching member, the size of its net, or its name, and after every transaction for category and account. The pager counts items and the totals line counts transactions. `GET /api/transactions` is unchanged.

**Writes.** Membership is written with `ExecuteUpdateAsync` on `GroupId` alone, so `UpdatedAt` stays and a closed month does not drift. A row is in at most one group. A group may start with one row and keeps its name with one member or none. Ungroup goes to the trash and records its members. The group routes are readable with a personal API token and writable only from the browser session.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

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
- **2026-10-01.** Groups are personal, `TransactionGroup : OwnableEntity`, and members must have `UserId == caller`
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
