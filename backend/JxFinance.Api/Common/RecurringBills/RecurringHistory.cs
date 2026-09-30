using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.RecurringBills;

public sealed record RecurringRow(
    RecurringBillShape Shape,
    Guid? TransactionId,
    AccountId AccountId,
    AccountId? ToAccountId,
    DateOnly Date,
    decimal Amount,
    Currency Currency,
    decimal? ReportingAmount,
    string Key);

public static class RecurringHistory
{
    public static async Task<List<RecurringRow>> LoadAsync(
        AppDbContext db,
        IEnumerable<RecurringBill> bills,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var keys = bills.SelectMany(PriceRiseMatcher.KeysOf).Distinct().ToList();
        if (keys.Count == 0)
        {
            return [];
        }

        var transactions = await db.Transactions
            .AsNoTracking()
            .Where(t => !t.IsSplit
                && t.Amount.Amount > 0
                && t.Date >= from
                && t.Date <= to
                && keys.Contains(t.PayeeKey!))
            .Select(t => new RecurringRow(
                t.Type == FlowType.Income ? RecurringBillShape.Income : RecurringBillShape.Expense,
                t.Id.Value,
                t.AccountId,
                null,
                t.Date,
                t.Amount.Amount,
                t.Amount.Currency,
                t.ReportingAmount,
                t.PayeeKey!))
            .ToListAsync(cancellationToken);
        var transfers = await db.Transfers
            .AsNoTracking()
            .Where(t => t.Description != null && t.Date >= from && t.Date <= to)
            .Select(t => new { t.FromAccountId, t.ToAccountId, t.Date, t.Amount.Amount, t.Amount.Currency, t.Description })
            .ToListAsync(cancellationToken);

        return
        [
            .. transactions,
            .. transfers
                .Select(t => new RecurringRow(
                    RecurringBillShape.Transfer,
                    null,
                    t.FromAccountId,
                    t.ToAccountId,
                    t.Date,
                    t.Amount,
                    t.Currency,
                    null,
                    SubscriptionDescription.Normalize(t.Description)))
                .Where(row => keys.Contains(row.Key)),
        ];
    }
}
