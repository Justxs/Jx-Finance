# Plan: Transaction groups

Status: planned 2026-09-30, reviewed against the code the same day. Size M to L. Gated: build only after the daily-use trial in the [backlog](../backlog.md) shows ledger rows that belong together often enough that tags and splits do not cover them; see [What must be true to build](#what-must-be-true-to-build). It adds one table, one column on `Transaction` and a ledger endpoint whose items are either a transaction or a group. Reports, budgets, balances and the existing transactions endpoint are unchanged.

## Outcome

- **Creating a group.** On the desktop, selecting two or more rows offers **Group** in the selection toolbar. A row's actions menu, on the desktop and the phone, offers **Add to group…** with a new or existing group; this also works for split rows, which the selection skips. Either way the dialog asks for a name, such as "Kitchen renovation" or "Trip to Riga".
- **The group row.** The members collapse into one ledger row with the name, the date range of its members, the member count and the net in the reporting currency: "Trip to Riga · 3–17 Jul · 14 rows · −€612.40". A chevron expands the members in place, each with its own date, category, account, amount and ordinary actions plus **Remove from group**.
- **Actions.** The group row's menu has Rename and **Ungroup**. Ungroup keeps every member, goes to the trash and raises the undo toast.
- **What a group can hold.** Rows from several accounts and currencies, and expenses, income and refunds together. Its net is the sum of the members' reporting amounts, with income positive.
- **Filters.** Filters apply to members. A group row appears when at least one member matches, shows "3 of 14 match" when not all do, and expands to the matching members.
- **Everywhere else.** Reports, budgets, balances, the month close, the dashboard's recent transactions, the import review and exports count each member as the row it is. Grouping changes how the ledger reads, not what the figures say. The CSV gains a `Group` column.
- **Ownership.** Groups are personal and hold only rows the caller entered. A housemate who sees those rows on a shared account sees them as ordinary rows.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Meaning | A ledger presentation: members keep their own category, date and amount everywhere else | Lunch Money's model, where the group takes one category and hides its members from reports | A category that overrides its members would be a third way of attributing spending next to categories and split lines, and every read path in `CategoryAttributionService` would need it. Splits already cover "one payment, many categories" and refunds cover "money back" |
| Versus tags | A group folds rows into one; a tag filters | Only documenting "use a tag and the ledger total" | The tag filter plus the ledger's summary already gives the net of a set of rows. What a tag cannot do is fold 14 card lines into one row between the others. That thin gap is why this plan is gated |
| Endpoint | A new `GET /api/transactions/ledger` returns `PagedResponse<LedgerItemResponse>`, a flat record with a `Kind` of `Transaction` or `Group` and nullable `Transaction` and `Group` parts. `GET /api/transactions` is unchanged | Changing `GET /api/transactions` to return mixed items; a polymorphic `oneOf` response | The recent-transactions card, the import review and the optimistic updates read the existing list, and none of them should see groups. The contract has no polymorphic response anywhere, while `AccountMovementRow` already uses a `Kind` enum on a flat record |
| Paging | SQL `Concat` of two projections to one row: the page's sort key, `Kind`, `Id` and `CreatedAt`. The ungrouped branch is filtered transactions whose group is absent or not visible to the caller. The group branch is the caller's groups with at least one filtered member, their keys computed by correlated `MAX`, `SUM` and `COUNT` over the filtered members. The page is paged, then its items are loaded and put back in page order | Collapsing on the client within a page | Members of one group can fall on two pages under any sort, so a client-side collapse would show a group twice or with a partial net |
| Sort keys of a group | Date: its newest matching member, so an ongoing group stays near the top of the default newest-first order. Amount: the absolute net, as transactions sort by the unsigned `ReportingAmount`. Description: its name. Category and account: groups follow all transactions in either direction, sorted by name | Its earliest date; a signed net; mixing groups into the category order | The newest date is where a reader looks for recent activity. Sorting by the absolute value keeps the existing amount order meaningful. A group has no category or account, and a separate `Kind` key leaves the existing order of uncategorized rows untouched |
| Counts | The pagination total counts ledger items; the summary above the table still counts transactions and is labelled so | One count | They answer different questions: how many lines to page through, and how many rows match |
| Ownership | `TransactionGroup : OwnableEntity`, personal, plain owner filter; members must have `UserId == caller` | Groups over any visible row; shareable groups | A group over a housemate's row would put my group id on their row. That clashes with their own grouping, and it would leak into their member export. Month closes and saved filters are personal for the same reason |
| Small groups | Two rows are needed to create a group. A group left with one live member, because a member was deleted or removed, still shows as a group, and one with none shows nothing | Deleting the group when it drops below two | Deleting behind the user's back would lose the name, and a restored member would come back without it |
| Switch | None | A `TransactionGroups` feature switch | Like tags, a group is a way of reading ledger rows, not a page of its own |
| Membership writes | `ExecuteUpdateAsync` on `GroupId` alone, leaving `UpdatedAt` untouched, like the bulk tag writes in `TagService` and `Common/TransactionUpdates.cs` | Setting `GroupId` through the change tracker | The tracker stamps `UpdatedAt`, and month-close drift would then report every grouped row of a closed month as edited, although no figure changed |
| Moving a row | A row is in at most one group; moving it means removing it first | Moving silently on add | A silent move would empty another group behind the user's back |
| Names | Not unique; `TransactionGroup.NameMaxLength = 120` | A unique name per owner | Two trips to Riga in different years are two groups with the same honest name, and the dialog lists them with their dates |
| Import review | Rows are grouped afterwards in the ledger | Grouping from the import review | The review already carries categories, tags, transfers and refunds. Grouping a statement's rows afterwards takes one selection |

## Data model

| Change | Detail |
| --- | --- |
| `TransactionGroup` | `Id` (`TransactionGroupId`), `UserId` (FK to the user, cascade like other owned tables), `Name` (1 to `NameMaxLength` = 120), plus the `EntityBase` fields |
| `Transaction.GroupId` | `TransactionGroupId?`, foreign key `OnDelete(SetNull)`, partial index `(GroupId) WHERE "GroupId" IS NOT NULL` |
| `TrashKind.TransactionGroup`, `DeletionChangeKind.GroupMember` | New enum values |
| Migration | `just migrate-add AddTransactionGroups` |

## Backend steps

1. **Slices.** A new tag in `Endpoints/TransactionGroups/` with its own `TransactionGroupsGroup` (`tokenReadable: true`), an `ApiTags` entry and `ApiRoutes.TransactionGroups = "transaction-groups"`:
   - `GetTransactionGroups`: `GET /api/transaction-groups` answers the caller's groups with at least one live member, newest first, as `TransactionGroupResponse(Guid Id, string Name, int MemberCount, DateOnly FirstDate, DateOnly LastDate)`.
   - `CreateTransactionGroup`: `POST /api/transaction-groups` with `CreateTransactionGroupRequest(string Name, IReadOnlyList<Guid> TransactionIds)`. It answers 201 with `TransactionGroupResponse` and `Location` at `/api/transaction-groups/{id}`.
   - `RenameTransactionGroup`: `PUT /{id}` with `RenameTransactionGroupRequest(Guid Id, string Name)`. It answers 200 with `TransactionGroupResponse`.
   - `AddToTransactionGroup`: `POST /{id}/members` with `AddToTransactionGroupRequest(Guid Id, IReadOnlyList<Guid> TransactionIds)`, 1 to `BulkRules.MaxTransactions`. It answers 204.
   - `RemoveFromTransactionGroup`: `DELETE /{id}/members/{transactionId}`. It answers 204.
   - `UngroupTransactionGroup`: `DELETE /{id}`. It answers 204.
   - `GetTransactionGroupMembers`: `GET /{id}/members` takes the ledger filter (`TransactionFilterRequest`) and answers the matching members as `IReadOnlyList<TransactionResponse>`, newest first. It is unpaged because a group holds at most a few hundred rows. Rows past `BulkRules.MaxTransactions` are cut, with a `Truncated` flag in a `GroupMembersResponse` wrapper.
   `Endpoints/TransactionGroups/Interfaces/ITransactionGroupService.cs` is injected by the endpoints, and `Services/TransactionGroupService.cs` does the work.
2. **Ledger.** `Endpoints/Transactions/GetLedger/`:
   - `GetLedgerRequest : TransactionFilterRequest, IPagedRequest`, with its own `Sort` and `Direction`, because `GetTransactionsRequest` is sealed. `GetTransactionsSummaryRequest` is the precedent.
   - `ITransactionService` gains `GetLedgerPageAsync`. It builds the `Concat` described above from `Filtered(request)`, applies the sort keys and pages. Then it loads the `TransactionResponse` rows and `TransactionGroupSummary(Guid Id, string Name, DateOnly FirstDate, DateOnly LastDate, int MemberCount, int MatchingCount, decimal NetReportingAmount)` for the page.
   - `LedgerItemResponse(LedgerItemKind Kind, TransactionResponse? Transaction, TransactionGroupSummary? Group)`.
   - The summary endpoint and both exports keep reading `Filtered(request)`.
3. **Transaction response.** `TransactionResponse` gains `GroupId` (`Guid?`) and `EnteredByMe` (`bool`, `UserId == caller`). The frontend uses them to decide when to offer Group, Add to group… and Remove from group.
4. **Validation and errors.**
   - The name uses `text.tooShort` and `text.tooLong`.
   - The member count on create uses `collection.invalidSize` (2 to `BulkRules.MaxTransactions`).
   - A transaction the caller cannot see answers 404 through `EntityLookup.NotFound`.
   - A visible transaction entered by someone else answers 403 `access.forbidden`.
   - A member already in another live group answers 409 with a new `transactionGroup.memberTaken`. That code joins the 409 list in `ErrorCodes.StatusCodeFor` and gets English and Lithuanian text.
5. **Writes.** Every membership change is one `ExecuteUpdateAsync` on `GroupId`, inside the service's transaction. The group row itself is saved through the tracker, like any owned entity.
6. **Trash.** `TrashKind.TransactionGroup` gets a restorer in `TrashRestorers.All` with `usesChanges: true`, copying the tag restorer, and a `TrashLabel` entry ("Trip to Riga, 14 transactions"). Ungroup records each member as a `DeletionChangeKind.GroupMember` change.
   - The restorer regroups the recorded members that are still live and in no other group.
   - A member trashed while grouped keeps its `GroupId`. When restored, it rejoins its group if the group is live, and otherwise shows as an ordinary row through the visibility clause of step 2.
7. **Retention.** The kind joins `Retention.PurgedKinds` with a `PurgeDeletedAsync` line, purged after its members' `SetNull` has nothing left to point at. `RetentionTests` lists it as purged.
8. **Member export and import.**
   - `UserExportTables` gets the table as `Owned`.
   - `MemberImport.Imported` gets `"TransactionGroups"`, so `UserExportTablesTests` passes and grouping survives a round trip; `UserId` is rewritten through its foreign key like every owned table.
   - A row on the member's account entered by a housemate carries a group id outside the export, and the import's existing repair step nulls it.
9. **Audit.** No change: `AuditCollector` audits an allowlist of `Transaction` fields, and `GroupId` stays out of it, so a personal group name never reaches the household log.
10. **CSV.** `TransactionCsvWriter` gains `Group` after `Note`, filled from group names loaded next to the account, category and tag names in the ledger export and in `UserExportService.ExportNames`. Update the header expectations in `TransactionExportTests` and `TransactionTagEndpointTests`.
11. **Token list.** `GET /api/transactions/ledger`, `GET /api/transaction-groups` and `GET /api/transaction-groups/{id}/members` join `TokenReadableTests.ReadableRoutes`.

## Frontend steps

1. `just gen`. In `src/api/invalidation.ts`:
   - `getTransactionsLedgerQueryKey`, `getTransactionGroupsQueryKey` and `getTransactionGroupMembersQueryKey` join the `ledger` array, so every existing transaction, trash and import rule refreshes them.
   - The six group mutations get one rule that invalidates `ledger` and the summary.
2. **Ledger query.**
   - `features/transactions/transaction-queries.ts` points the page at the ledger endpoint.
   - `routes/transactions.tsx`'s loader and warm-up, and `transactions-page-pending`, switch to it.
   - The optimistic create and delete in `transactions-page/use-transaction-mutations.ts` update `LedgerItemResponse` pages instead of `PagedResponseOfTransactionResponse`, and the optimistic row gains `groupId` and `enteredByMe`.
   - `recent-transactions-list.tsx` and `import-section.tsx` keep the old endpoint.
3. **Table.**
   - `transactions-table/use-transaction-columns.tsx` renders a group item with a chevron button (`aria-expanded`, named "Show the 14 rows of Trip to Riga"), the name, the date range, the member count or "3 of 14 match", and the net through `TransactionAmount`.
   - Expanding fetches the members with the current filter and renders them as indented rows, with a skeleton row while pending and an inline error with Retry on failure. The expansion state is local to the page and cleared on navigation, like the selection.
   - After Ungroup, focus moves to the first former member.
   - `transactions-list/transactions-list.tsx` does the same on the phone, expanding in the list.
4. **Creating.**
   - `selection-toolbar.tsx` gains Group, enabled for two or more selected rows that all have `enteredByMe`.
   - `transaction-row-actions.tsx` gains Add to group… for rows with `enteredByMe` and no `groupId`, and Remove from group for rows with a `groupId`.
   - Both open `features/transactions/group-dialog/group-dialog.tsx`. It has a name field and, from the row action, a choice between a new group and one from `GET /api/transaction-groups`.
5. **Group actions.** Rename opens the same dialog with the name. Ungroup goes through `useConfirmedDelete` with the undo toast.
6. **Text.** English and Lithuanian keys under `transactions.groups`:
   - `group`, `addToGroup`, `removeFromGroup`, `rename`, `ungroup`,
   - `dialogTitle`, `newGroup`, `existingGroup`, `name`,
   - `rows` and `matching` (plural forms), `showRows`, `noGroups`,
   - `trash.kinds.transactionGroup` and `serverErrors.transactionGroup.memberTaken`.
7. **Stories.**
   - The group row: collapsed, expanded, a partial match, members pending, members error.
   - `group-dialog`: from the selection, from a row with groups, from a row with none, pending, and `failWith` `transactionGroup.memberTaken`.
   - A `play` that selects two rows and groups them.

## Tests

- **Integration:**
  - **Paging and sorting:**
    - A group occupies one ledger item under every sort, and paging never shows it twice.
    - The newest member's date places it.
    - Category and account sorts put groups after transactions.
  - **Filtering:** the filter shows a group when one member matches, with the right `MatchingCount`, and the members endpoint returns only the matching rows.
  - **Unchanged by grouping:**
    - The summary, both exports' figures, reports, budgets and `GET /api/transactions`.
    - A closed month does not drift when its rows are grouped or ungrouped.
  - **Housemates:** a housemate sees the members on a shared account as plain rows and never sees the group.
  - **Errors:**
    - Grouping a row entered by someone else gives 403, and an invisible row gives 404.
    - A row in another group gives `transactionGroup.memberTaken`.
  - **Trash:**
    - Ungroup and restore round-trip.
    - A member trashed while grouped comes back into its group.
    - A member restored after its group was ungrouped comes back as an ordinary row.
  - **Member export:** export and import keep the grouping, and the CSV carries the group name.
- **Unit:** the trash restorer, `UserExportTables`, `MemberImport` and `RetentionTests` pick up the new table.
- **Frontend:** a unit test for the optimistic create on a ledger page.

## Docs

- A new `docs/features/transaction-groups.md` and a row in `docs/features/README.md`.
- A new `docs/decisions/transaction-groups.md` with a row in `docs/decisions/README.md`. It covers the presentation-only meaning, the new ledger endpoint, the sort keys, membership writes without `UpdatedAt`, and the rejected Lunch Money model.
- `docs/features/transactions.md` (the ledger endpoint and item kinds), `docs/features/trash-and-undo.md`, `docs/features/exports.md`, `docs/features/data-export-per-user.md` (older exports cannot be imported after the migration), `docs/user-flows.md`, `docs/data-model.md`, `docs/api.md` and `docs/scope.md`.

## What must be true to build

1. During the daily-use trial, the owner can name at least three real events a month whose rows they wanted folded together, and for which a tag plus the ledger total was not enough.
2. Otherwise the item stays in the backlog with that finding recorded, and this plan is deleted.

## What must be true to ship

1. On a ledger of 20,000 rows and 200 groups, the ledger page answers within 300 ms at the 95th percentile under every sort, measured with the request log.
2. The integration tests above pass, and the month close shows no drift from grouping alone.

## Open questions

None. Groups stay personal (the Ownership decision), and the import review does not group (the Import review decision).
