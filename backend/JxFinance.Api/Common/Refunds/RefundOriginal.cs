using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Refunds;

public static class RefundOriginal
{
    public const int CandidateLookBackDays = 90;

    public static readonly DomainError Invalid = new(
        ErrorCodes.TransactionRefundOriginalInvalid,
        "The refunded purchase must be an expense you can see, not a refund and not this transaction.");

    public static async Task<HashSet<TransactionId>> ValidAsync(
        IQueryable<Transaction> transactions,
        IReadOnlyCollection<TransactionId> ids,
        CancellationToken cancellationToken) =>
        ids.Count == 0
            ? []
            : (await transactions
                .Where(t => ids.Contains(t.Id) && t.Type == FlowType.Expense && t.Amount.Amount > 0)
                .Select(t => t.Id)
                .ToListAsync(cancellationToken))
            .ToHashSet();

    public static async Task<DomainError?> CheckAsync(
        IQueryable<Transaction> transactions,
        Guid? originalId,
        TransactionId? refundId,
        CancellationToken cancellationToken)
    {
        if (originalId is not { } id)
        {
            return null;
        }

        var original = new TransactionId(id);
        return original != refundId && (await ValidAsync(transactions, [original], cancellationToken)).Contains(original)
            ? null
            : Invalid;
    }
}
