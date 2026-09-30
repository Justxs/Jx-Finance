using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Unusual;

public sealed record BillMatchTarget(
    AccountId AccountId,
    IReadOnlyList<string> Keys,
    RecurringBillKind Kind,
    decimal? Amount,
    Currency Currency)
{
    public static BillMatchTarget Of(RecurringBill bill, Currency currency) =>
        new(bill.AccountId!.Value, PriceRiseMatcher.KeysOf(bill), bill.Kind, bill.Amount, currency);
}

public sealed record BankCharge(
    Guid TransactionId,
    AccountId AccountId,
    DateOnly Date,
    decimal Amount,
    Currency Currency,
    string Key);

public sealed record PriceComparison(decimal Charged, decimal Expected)
{
    public bool IsRise => PriceRiseRule.IsRise(Charged, Expected);
}

public static class PriceRiseMatcher
{
    public static string KeyOf(string? matchKey, string name) =>
        SubscriptionDescription.Normalize(string.IsNullOrWhiteSpace(matchKey) ? name : matchKey);

    public static IReadOnlyList<string> KeysOf(RecurringBill bill) =>
        new[] { KeyOf(bill.MatchKey, bill.Name), SubscriptionDescription.Normalize(bill.Name) }
            .Where(key => key.Length > 0)
            .Distinct()
            .ToArray();

    public static Task<List<BankCharge>> LoadChargesAsync(
        IQueryable<Transaction> transactions,
        IReadOnlyCollection<AccountId> accountIds,
        DateOnly since,
        FlowType type,
        CancellationToken cancellationToken,
        IReadOnlyCollection<string>? keys = null)
    {
        var from = since.AddMonths(-PriceRiseRule.LookBackMonths);
        return transactions
            .AsNoTracking()
            .Where(t => keys == null || keys.Contains(t.PayeeKey!))
            .Where(t => accountIds.Contains(t.AccountId)
                && t.Type == type
                && !t.IsSplit
                && t.Amount.Amount > 0
                && t.Description != null
                && t.Date >= from)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Take(UnusualAmountService.MaxHistoryRows)
            .Select(t => new BankCharge(
                t.Id.Value,
                t.AccountId,
                t.Date,
                t.Amount.Amount,
                t.Amount.Currency,
                SubscriptionDescription.Normalize(t.Description)))
            .ToListAsync(cancellationToken);
    }

    public static bool Matches(BillMatchTarget bill, BankCharge charge) =>
        bill.AccountId == charge.AccountId
        && bill.Currency == charge.Currency
        && bill.Keys.Contains(charge.Key);

    public static PriceComparison? Compare(BillMatchTarget bill, BankCharge charge, IEnumerable<BankCharge> history)
    {
        var from = charge.Date.AddMonths(-PriceRiseRule.LookBackMonths);
        var earlier = history
            .Where(other => Matches(bill, other) && other.Date < charge.Date && other.Date >= from)
            .Select(other => other.Amount)
            .ToList();
        var fixedAmount = bill.Kind == RecurringBillKind.Fixed ? bill.Amount : null;

        return PriceRiseRule.Expected(fixedAmount, earlier) is { } expected
            ? new PriceComparison(charge.Amount, expected)
            : null;
    }
}
