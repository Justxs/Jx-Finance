using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.SettleUp;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

internal static class HouseholdRestores
{
    private static readonly DomainError NotHouseholdMember =
        new(ErrorCodes.HouseholdNotMember, "You are no longer a member of the household this belonged to.");

    private static readonly DomainError SplitTransactionGone =
        new(ErrorCodes.RestoreReferenceMissing, "The transaction this split belonged to is deleted. Restore the transaction first.");

    private static readonly DomainError SplitAgain =
        new(ErrorCodes.SettleUpAlreadySplit, "The transaction has been split again since. Delete that split first.");

    private static readonly DomainError TransferSettledAgain =
        new(ErrorCodes.SettleUpTransferTaken, "The transfer of this payment settles another payment now.");

    private static readonly DomainError ContactGone =
        new(ErrorCodes.RestoreReferenceMissing, "The person this payment was with is deleted. Restore the person first.");

    private static readonly DomainError NotHouseholdOwner =
        new(ErrorCodes.AccessForbidden, "Only an owner of this household can restore it.");

    internal static async Task<Result> CheckHouseholdOwnerAsync(TrashRestore r, Household household)
    {
        var householdId = household.Id;
        var isOwner = await r.Db.HouseholdMemberships
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                m => m.HouseholdId == householdId
                    && m.UserId == r.UserId
                    && m.Role == HouseholdRole.Owner,
                r.CancellationToken);

        return isOwner ? Result.Success() : NotHouseholdOwner;
    }

    internal static async Task<Result> RestoreHouseholdAsync(TrashRestore r, Household household)
    {
        var db = r.Db;
        var householdId = household.Id;
        var members = await db.HouseholdMemberships
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(m => m.HouseholdId == householdId)
            .Select(m => m.UserId)
            .ToListAsync(r.CancellationToken);
        var now = r.Clock.UtcNow;
        foreach (var set in ShareableSet.All)
        {
            await set.ReshareAsync(db, r.Entry.Remembered(set.ShareKind), members, householdId, now, r.CancellationToken);
        }

        return Result.Success();
    }

    internal static async Task<Result> MemberOfAsync(TrashRestore r, HouseholdId householdId) =>
        await r.IsLiveMemberAsync(householdId, r.UserId) ? Result.Success() : NotHouseholdMember;

    internal static async Task<Result> RestoreSplitAsync(TrashRestore r, TransactionId transactionId, Guid splitId)
    {
        await r.Db.Database.LockAsync(transactionId.Value, r.CancellationToken);
        var transaction = await r.Db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == transactionId, r.CancellationToken);
        if (transaction is null)
        {
            return SplitTransactionGone;
        }

        if (await SplitRules.RefusedAsync(r.Db, r.UserId, transaction, r.CancellationToken) is { } refused)
        {
            return refused;
        }

        return await SplitRules.IsSplitAsync(r.Db, transactionId, splitId, r.CancellationToken) ? SplitAgain : Result.Success();
    }

    internal static async Task<Result> CheckContactAsync(TrashRestore r, ContactPayment payment) =>
        await r.Db.Contacts.AnyAsync(c => c.Id == payment.ContactId, r.CancellationToken) ? Result.Success() : ContactGone;

    internal static async Task<Result> RestoreSettlementAsync(TrashRestore r, Settlement settlement)
    {
        if (settlement.TransferId is not { } transferId)
        {
            return Result.Success();
        }

        var settledAgain = await r.Db.Settlements
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(s => s.TransferId == transferId && s.Id != settlement.Id, r.CancellationToken);
        return settledAgain ? TransferSettledAgain : Result.Success();
    }
}
