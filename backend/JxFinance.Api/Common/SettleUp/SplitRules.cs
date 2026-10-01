using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.SettleUp;

public static class SplitRules
{
    public static readonly DomainError AlreadySplit = new(ErrorCodes.SettleUpAlreadySplit, "This expense is already split.");

    private static readonly DomainError TransactionNotFound = new(ErrorCodes.ReferenceNotFound, "Transaction not found.");
    private static readonly DomainError NotPayer =
        new(ErrorCodes.SettleUpNotPayer, "Only an expense paid from an account you own can be split.");
    private static readonly DomainError NotExpense = new(ErrorCodes.SettleUpNotExpense, "Only an expense can be split.");

    public static async Task<DomainError?> RefusedAsync(
        AppDbContext db,
        Guid payerId,
        Transaction? transaction,
        CancellationToken cancellationToken)
    {
        if (transaction is null)
        {
            return TransactionNotFound;
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == transaction.AccountId && a.UserId == payerId, cancellationToken))
        {
            return NotPayer;
        }

        return transaction is { Type: FlowType.Expense, Amount.Amount: > 0 } ? null : NotExpense;
    }

    public static async Task<bool> IsSplitAsync(
        AppDbContext db,
        TransactionId transactionId,
        Guid exceptId,
        CancellationToken cancellationToken)
    {
        var expense = new SharedExpenseId(exceptId);
        var contactSplit = new ContactSplitId(exceptId);
        return await db.SharedExpenses
                .IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AnyAsync(e => e.TransactionId == transactionId && e.Id != expense, cancellationToken)
            || await db.ContactSplits
                .IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AnyAsync(s => s.TransactionId == transactionId && s.Id != contactSplit, cancellationToken);
    }
}
