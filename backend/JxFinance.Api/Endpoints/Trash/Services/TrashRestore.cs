using JxFinance.Common.Holdings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

public sealed record TrashRestore(
    AppDbContext Db,
    Guid UserId,
    IClock Clock,
    IHoldingLedger Ledger,
    AttachmentStore AttachmentFiles,
    DeletionEntry Entry,
    CancellationToken CancellationToken)
{
    public Task<bool> AccountVisibleAsync(AccountId accountId) =>
        Db.Accounts.AnyAsync(a => a.Id == accountId, CancellationToken);

    public Task<bool> CategoryLivesAsync(CategoryId categoryId) =>
        Db.Categories
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(c => c.Id == categoryId, CancellationToken);

    public Task<bool> IsLiveMemberAsync(HouseholdId householdId, Guid userId) =>
        Db.HouseholdMemberships
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                m => m.HouseholdId == householdId
                    && m.UserId == userId
                    && Db.Households.IgnoreQueryFilters(QueryFilters.OwnerOnly).Any(h => h.Id == householdId),
                CancellationToken);
}
