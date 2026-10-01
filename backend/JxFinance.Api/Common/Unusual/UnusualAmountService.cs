using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Unusual;

[RegisterService<IUnusualAmountService>(LifeTime.Scoped)]
public sealed class UnusualAmountService(AppDbContext db) : IUnusualAmountService
{
    public const int MaxHistoryRows = 5000;

    public async Task<IReadOnlyList<UnusualVerdict?>> EvaluateAsync(
        IReadOnlyList<UnusualCandidate> candidates,
        CancellationToken cancellationToken)
    {
        if (candidates.Count == 0)
        {
            return [];
        }

        var latest = candidates.Max(c => c.Date);
        var earliest = candidates.Min(c => c.Date).AddMonths(-UnusualAmountRule.LookBackMonths);
        var accountIds = candidates.Select(c => c.AccountId).Distinct().ToList();
        var categoryIds = candidates.Select(c => c.CategoryId).Where(id => id is not null).Distinct().ToList();

        var rows = await db.Transactions
            .AsNoTracking()
            .Where(t => t.Type == FlowType.Expense && !t.IsSplit && t.ReportingAmount > 0 && t.Date >= earliest && t.Date < latest)
            .Where(t => accountIds.Contains(t.AccountId) || categoryIds.Contains(t.CategoryId))
            .OrderByDescending(t => t.Date)
            .Take(MaxHistoryRows)
            .Select(t => new HistoryRow(t.AccountId, t.CategoryId, t.Date, t.ReportingAmount, t.PayeeKey))
            .ToListAsync(cancellationToken);

        var byPayee = rows.ToLookup(row => (row.AccountId, row.PayeeKey));
        var byCategory = rows
            .Where(row => row.CategoryId is not null)
            .ToLookup(row => row.CategoryId!.Value);

        return candidates.Select(candidate => Evaluate(candidate, byPayee, byCategory)).ToList();
    }

    private static UnusualVerdict? Evaluate(
        UnusualCandidate candidate,
        ILookup<(AccountId AccountId, string? PayeeKey), HistoryRow> byPayee,
        ILookup<CategoryId, HistoryRow> byCategory)
    {
        if (candidate.ReportingAmount <= 0)
        {
            return null;
        }

        if (candidate.PayeeKey is { Length: > 0 } key)
        {
            var payee = History(byPayee[(candidate.AccountId, key)], candidate);
            if (payee.Count >= UnusualAmountRule.PayeeMinimumHistory)
            {
                return UnusualAmountRule.Evaluate(candidate.ReportingAmount, payee, UnusualBasis.Payee);
            }
        }

        return candidate.CategoryId is { } categoryId
            ? UnusualAmountRule.Evaluate(
                candidate.ReportingAmount,
                History(byCategory[categoryId], candidate),
                UnusualBasis.Category)
            : null;
    }

    private static List<decimal> History(IEnumerable<HistoryRow> rows, UnusualCandidate candidate)
    {
        var from = candidate.Date.AddMonths(-UnusualAmountRule.LookBackMonths);
        return rows
            .Where(row => row.Date >= from && row.Date < candidate.Date)
            .Select(row => row.ReportingAmount)
            .ToList();
    }

    private sealed record HistoryRow(
        AccountId AccountId,
        CategoryId? CategoryId,
        DateOnly Date,
        decimal ReportingAmount,
        string? PayeeKey);
}
