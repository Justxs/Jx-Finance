# Plan: Sharing assets and debts with a household

Status: planned 2026-09-30, reviewed against the code the same day. Size M. It makes `Asset` and `Debt` shareable exactly as commit c5c31d0b made budgets, goals and recurring entries shareable, and settles what is special about them: valuations, tracked debt payments, the audit log and net worth. It closes the backlog row "Households | Assets and debts cannot be shared". Build after nothing.

## Outcome

- The asset and debt forms gain the **Visibility** select the budget, goal and recurring-entry forms have: Personal, or shared with one of your households. The net worth lists, the asset page and the debt page show the shared tag.
- **Net worth.** A shared asset or debt counts in full in the net worth of every member who can see it, as a shared account already does. The household switcher narrows the list to one household like everything else.
- **What members may do:**
  - **Asset valuations:** any member who can see the asset may add or remove a valuation.
  - **Debt payments:** any member who can see the debt may link a payment to it, change the principal or unlink one. A shared debt's tracked balance is the same for every member.
  - **Owner only:** changing the visibility and deleting stay with the owner, as for the other shared records. A member who tries is told so by the delete dialog, exactly as on a shared goal.
- **Recurring entries.** A recurring entry may pay a shared debt when the entry's account is shared with the same household. Until now a shared entry could not pay a debt at all.
- **Losing access.** When the household is deleted or the owner leaves it, the owner's shared assets and debts become personal again, and restoring the household shares them again, as for the other records. When an account holding linked payments is unshared later, those payments show under the debt's existing "unavailable payments" for the members who can no longer see them.
- **Activity log.** A shared asset's or debt's changes appear in the household's activity log, including valuations and payment links.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Counting in net worth | In full, for every member who can see it | Only for the owner; a share per member | `docs/decisions/net-worth.md` counts every visible account in full and rejects ownership percentages. Assets and debts must follow the same rule, or a shared mortgage would count for one partner while the house it pays for counts for both |
| Debt payments' visibility | A `DebtPayment` is visible when its debt is visible, through a filter on the debt like the attachment filter, instead of the plain owner filter on the linker | Keeping links owner-filtered | With owner filtering, each member would see only their own links, and the same debt would show different balances to each partner |
| Which transactions may pay a shared debt | Only transactions on accounts shared with the debt's household. This applies to linking by hand, to the candidates list and to the automatic link a recurring entry's confirmation makes. Sharing a debt whose linked payments sit on other accounts is refused with `household.referenceNotShared` | Allowing any visible transaction and showing the rest as unavailable | A payment from a personal account is invisible to the partner, so their balance would differ. Refusing up front keeps one balance, and the error code already exists for exactly this rule |
| Who may link | Any member who can see both the debt and the transaction | The debt's owner only | Members may already edit a shared record's other fields, and recording a payment is an edit. The owner keeps visibility and deletion |
| Valuations | Follow their asset: whoever can see the asset may add or delete one. `DeleteValuationAsync` locks on the asset's id instead of the caller's id; `SetValuationAsync` keeps its `SaveOrConflictAsync` | Owner-only valuations; locking on the owner's user id | A valuation is the asset's history, which a partner may know better (the car's mileage, the flat's appraisal). Locking on the asset id makes two members' deletes serialize without a second query, and leaves the per-user lock that `GetCurrentAsync` and the month close share untouched |
| Delete by a member | The delete action stays visible, and a non-owner gets `403 access.forbidden` shown in the confirm dialog, as on shared goals | Hiding it with a new `IsOwner` field | Shared goals, budgets and recurring entries behave this way today. A second pattern for two more record kinds would make the interface inconsistent |
| Snapshots | Per member, the member's whole net worth, as today. Under an active household, `GetCurrentAsync` answers the narrowed totals without writing, then asks `INetWorthSnapshotter.SnapshotAsync(currentUser.Id)` to store the whole figure after its own transaction ends. With no active household the path is unchanged | Snapshots per household; computing the whole figure inside the same locked transaction | Month close and the dashboard read "the user's whole net worth whatever the scope" (`docs/features/month-end-close.md`). The snapshotter opens its own scope, which would wait forever on the advisory lock `GetCurrentAsync` holds if called inside it |
| Audit | `AuditEntityKind.Asset` and `Debt` on `Route.Shareable`. Valuations and payment links are reported as the `valuations` and `payments` fields of their asset's or debt's event, through new child lookups in the Shareable pass | Separate event kinds for valuations and links | One event per edit keeps the log readable. The Shareable pass today only sees rows whose own entity changed, so the child lookups are new work, described in backend step 6 |

## Data model

| Change | Detail |
| --- | --- |
| `Asset`, `Debt` | Implement `IShareable`: `Scope Scope = Scope.Personal`, `HouseholdId? HouseholdId` |
| Migration | `just migrate-add ShareAssetsAndDebts`, the same shape as `SharePlansWithHousehold`: nullable `HouseholdId` with an index and a restricting FK, `Scope` int default 0 |
| `DebtPayment` filter | In `AppDbContext.OwnerFilter`, a `DebtPayment` branch: visible when `Debts.Any(d => d.Id == p.DebtId)` under the debt's own filter, like the attachment filter |
| `DeletionChangeKind` | `AssetShare`, `DebtShare` |
| `AuditEntityKind` | `Asset`, `Debt` |

`AssetValuation` needs no change. It is not an `EntityBase`, has no filter, and is reached only through its asset.

## Backend steps

1. **Requests, responses and mapping.**
   - The asset and debt create and update requests gain `Scope Scope = Scope.Personal, Guid? HouseholdId = null`, and their inputs implement `IShareableInput`.
   - `AssetResponse` and `DebtResponse` gain `Scope` and `HouseholdId`, like `GoalResponse`.
   - The mappers call `ApplySharing`.
   - The validators add `RequiresHouseholdWhenShared("asset")` and `RequiresHouseholdWhenShared("debt")`.
2. **Service shape.** In `NetWorthService`:
   - Create calls `sharing.CheckAsync(request)`.
   - Update loads, calls `sharing.CheckAsync(existing, request)`, then applies. `UpdateDebtAsync` moves off `UpdateOrNotFoundAsync` to this shape, like `UpdateAssetAsync`.
   - `DeleteAssetAsync` and `DeleteDebtAsync` refuse a non-owner with `access.forbidden` ("Only the owner can delete a shared asset." / "…debt."), like `GoalService`.
3. **Debt references.**
   - When a debt is created or updated as shared, `CheckReferencesAsync` checks the accounts of its linked payments' transactions. It runs again whenever the scope, the household or `TracksPayments` changes.
   - `LinkDebtPaymentAsync` refuses a transaction whose account is not shared with a shared debt's household.
   - The candidates query leaves such transactions out.
   - The orphan cleanup in `LinkDebtPaymentAsync` (the `ExecuteDeleteAsync` over links whose debt is gone) uses `IgnoreQueryFilters()`. Under the new filter it would otherwise never see the orphans it exists to remove.
   - All refusals answer `household.referenceNotShared`.
4. **Recurring entries.**
   - `SharedReferences` gains `Debts`, and `CheckReferencesAsync` checks that a referenced debt is shared with the same household.
   - For any entry, personal or shared, pointing at a shared debt, the entry's account must be shared with the debt's household; otherwise `household.referenceNotShared`.
   - `RecurringBillService` passes the debt instead of `HasPersonalOnly: input.DebtId is not null`.
5. **Valuations.** `DeleteValuationAsync` takes its advisory lock on the asset id (`request.Id`), not `currentUser.Id`.
6. **Audit.**
   - `AuditCollector` registers `Audited.Of<Asset>(AuditEntityKind.Asset, Route.Shareable, (_, a) => a.Name, Name, Type, CurrentValue, AsOf)` and the debt equivalent (`Name`, `Type`, `OutstandingAmount`, `InterestRate`, `TracksPayments`).
   - The Shareable pass gains `touchedByValuations` and `touchedByPayments`. These are the ids of assets and debts whose `AssetValuation` or `DebtPayment` rows were added, modified or deleted in the save, concatenated into the Shareable pass the way `touchedByChildren` feeds the Scoped pass. Their changes appear as a `valuations` field ("Valuation 2026-09-01: €18,000.00") and a `payments` field ("Linked Swedbank, 2026-09-15, €450.00").
   - The stored-children loading, now typed to `TransactionId`, becomes generic over the parent id, so it can load valuations by `AssetId` and payments by `DebtId`.
   - `UnlinkDebtPaymentAsync` switches from `ExecuteDeleteAsync` to loading the link and calling `Remove()`, so the change tracker sees it. `UpdateDebtPaymentAsync` already goes through the tracker.
7. **Snapshots.** As in the Snapshots decision: under an active household, `GetCurrentAsync` computes the narrowed totals without the upsert, and after committing calls `INetWorthSnapshotter.SnapshotAsync(currentUser.Id)`.
8. **Household lifecycle.** `ShareableSet.All` gains `new Of<Asset, AssetId>(db => db.Assets, DeletionChangeKind.AssetShare, "asset", "assets")` and the debt equivalent. That covers household delete, member removal, household restore and the trash label counts with no other change.
9. **Member export.**
   - `UserExportTables` moves `DebtPayments` from `Owned()` to `new ChildOf("Debts", "DebtId")`, so a partner's link on the member's debt travels with the debt.
   - A link whose transaction sits on an account the member does not own is dropped by the import's repair step, because its transaction is not in the export. The docs say so.
   - `MemberImport` needs nothing else: it already resets `Scope` and `HouseholdId`.
10. **Error codes:** none new. `household.required`, `household.notMember`, `household.referenceNotShared` and `access.forbidden` cover every case.

## Frontend steps

1. `just gen`. The asset, debt and debt-payment mutations are already in `src/api/invalidation.ts`, so no invalidation changes.
2. **Forms.** `features/net-worth/assets-section/asset-form.tsx` and `debts-section/debt-form.tsx`:
   - take `useSharingDefaults(useHouseholdsSuspense().data, initial)`,
   - wrap their schemas in `refineSharing(z.object({ ...sharingShape() }), t)`,
   - spread `sharingPayload(value)` into the request,
   - render `<SharingFields … idPrefix="asset">`, like `goal-form`.
   Under an active household a new debt therefore defaults to shared. That is safe, because a new debt has no links yet.
3. **Lists and pages.** `BalanceItem` in `balance-items-section.tsx` gains optional `scope` and `householdId`, and the row renders `SharedScopeTag` under the name. The asset page and the debt schedule page show it next to the title.
4. **Payments.** `debt-payment-form` shows `household.referenceNotShared` inline when a chosen transaction's account is not shared.
5. **Activity.**
   - `features/households/household-activity/activity-filters.ts` gains the two kinds.
   - `activity-sentences.ts` `FIELDS` gains `currentValue`, `asOf`, `outstandingAmount`, `interestRate`, `tracksPayments`, `valuations` and `payments`.
6. **Text.** English and Lithuanian for `audit.kinds.asset`, `audit.kinds.debt` and `audit.fields.*` of each new field.
7. **Stories.**
   - `SharedWithHousehold` states for the asset and debt forms, the balance item row, the asset page and the debt schedule page. Fixtures gain a shared asset and a shared tracked debt.
   - A `play` on the debt form sets Visibility.
   - A new `debt-payment-form/debt-payment-form.stories.tsx` with default, candidates empty, pending and `failWith` `household.referenceNotShared`.

## Tests

- **Integration:** a new `Integration/Households/SharedWealthTests.cs`, modelled on `SharedPlanTests`:
  - **Visibility and editing:**
    - A shared asset counts in both members' net worth.
    - A member edits and adds or deletes a valuation, but only the owner deletes or unshares.
  - **Tracked payments:**
    - A partner links a payment from a shared account, and both see the same tracked balance.
    - Linking a payment from a personal account to a shared debt is refused.
    - Sharing a debt with personal-account payments is refused.
    - Candidates for a shared debt list only shared-account transactions.
    - An orphaned link to a deleted debt is still cleaned up on the next link.
  - **Recurring entries:**
    - A shared recurring entry pays a debt shared with the same household, and one shared with another household is refused.
    - A personal entry on a personal account pointing at a shared debt is refused.
  - **Household lifecycle:** deleting the household makes both personal, and restoring re-shares them.
  - **Audit:** the activity log records an asset valuation, a payment link and an unlink.
  - **Snapshots:** `GET /api/networth` under an active household answers the narrowed total and leaves the stored snapshot equal to the whole figure.
  - **Member export:** it carries a partner's link on the member's debt when the transaction is on the member's own account.
- **Existing tests:** they use personal records and must keep passing unchanged. They are `DebtScheduleEndpointTests`, `NetWorthIsolationTests`, `DebtPaymentTests` (including `A_housemate_edit_moves_the_balance_but_the_housemate_sees_no_link`), `AssetValuationTests` and `UserIsolationTests`.
- **Unit:** `AuditCollectorTests` requires a registry entry for every shareable entity, and so forces the two new entries. The `TrashRestorers` and `UserExportTables` classification tests still pass.

## Docs

- `docs/features/households-and-sharing.md`: the per-record table gains assets and debts, and the diagram no longer shows them as owner only.
- `docs/decisions/households-and-sharing.md`: a Log entry for counting in full, links following the debt, the shared-account rule for payments, and the snapshot rule. Update the Current section.
- Feature pages:
  - `docs/features/net-worth.md`,
  - `docs/features/debt-amortization.md`: replace "Debts are personal…" and describe unavailable payments after an unshare,
  - `docs/features/audit-log.md`: no longer "never logged",
  - `docs/features/recurring-bills.md`: which entries may pay a shared debt,
  - `docs/features/data-export-per-user.md`: which partner links travel.
- `docs/architecture/sharing.md` (the list of shareable entities), `docs/data-model.md` (line 29) and `docs/api.md`.
- `docs/scope.md`: §Households and §Net worth, and the stale "expanded sharing for budgets/goals/assets/debts/bills" in "Outside this release".
- `docs/backlog.md`: move the row to Done.

## What must be true to ship

1. Two members of one household see the same net worth contribution, tracked balance and payment list for every shared asset and debt.
2. `SharedWealthTests` pass, and no existing sharing, debt or net-worth test changes behaviour.

## Open questions

None.
