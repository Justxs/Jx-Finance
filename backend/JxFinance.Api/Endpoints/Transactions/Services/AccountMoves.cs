using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

public static class AccountMoves
{
    private static readonly DomainError ConversionFee = new(
        ErrorCodes.TransactionConversionFee,
        "This is the fee of a currency conversion, which stays on the conversion's account.");

    private static readonly DomainError PayerDoesNotOwn = new(
        ErrorCodes.SettleUpNotPayer,
        "This expense is split with a household, and the member who paid it does not own that account.");

    private static readonly DomainError DebtNotShared = new(
        ErrorCodes.HouseholdReferenceNotShared,
        "This pays a shared debt, so it can only be on an account shared with the debt's household.");

    public static async Task<Dictionary<TransactionId, DomainError>> RefusalsAsync(
        AppDbContext db,
        IReadOnlyList<Transaction> rows,
        Account target,
        CancellationToken cancellationToken)
    {
        var ids = rows.Select(t => t.Id).ToList();
        var nullableIds = ids.Select(id => (TransactionId?)id).ToList();
        var fees = await db.CurrencyConversions
            .Where(c => nullableIds.Contains(c.FeeTransactionId))
            .Select(c => c.FeeTransactionId)
            .ToListAsync(cancellationToken);
        var payers = await db.SharedExpenses
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(e => ids.Contains(e.TransactionId))
            .Select(e => new { e.TransactionId, e.UserId })
            .ToListAsync(cancellationToken);
        var sharedDebts = await db.DebtPayments
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(p => ids.Contains(p.TransactionId))
            .Join(
                db.Debts.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(d => d.Scope == Scope.Shared),
                p => p.DebtId,
                d => d.Id,
                (p, d) => new { p.TransactionId, d.HouseholdId })
            .ToListAsync(cancellationToken);

        var refusals = new Dictionary<TransactionId, DomainError>();
        foreach (var feeId in fees.OfType<TransactionId>())
        {
            refusals.TryAdd(feeId, ConversionFee);
        }

        foreach (var split in payers.Where(p => p.UserId != target.UserId))
        {
            refusals.TryAdd(split.TransactionId, PayerDoesNotOwn);
        }

        foreach (var payment in sharedDebts.Where(p => target.Scope != Scope.Shared || target.HouseholdId != p.HouseholdId))
        {
            refusals.TryAdd(payment.TransactionId, DebtNotShared);
        }

        return refusals;
    }
}
