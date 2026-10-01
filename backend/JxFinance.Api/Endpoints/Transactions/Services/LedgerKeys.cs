using System.Linq.Expressions;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.GetLedger;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Endpoints.Transactions.Services;

public static class LedgerKeys
{
    public static IQueryable<LedgerKey> Of(AppDbContext db, IQueryable<Transaction> filtered, TransactionSortField sort)
    {
        var noDate = DateOnly.MinValue;
        var noAmount = 0m;
        var ungrouped = filtered.Where(t => t.GroupId == null || !db.TransactionGroups.Any(g => g.Id == t.GroupId));
        var groups = db.TransactionGroups.Where(g => filtered.Any(t => t.GroupId == g.Id));

        Expression<Func<Transaction, LedgerKey>> row = sort switch
        {
            TransactionSortField.Category => t => new LedgerKey
            {
                Kind = LedgerItemKind.Transaction,
                Id = (Guid)(object)t.Id,
                CreatedAt = t.CreatedAt,
                Date = t.Date,
                Amount = t.ReportingAmount,
                Name = db.Categories.Where(c => c.Id == t.CategoryId).Select(c => c.Name).FirstOrDefault(),
            },
            TransactionSortField.Account => t => new LedgerKey
            {
                Kind = LedgerItemKind.Transaction,
                Id = (Guid)(object)t.Id,
                CreatedAt = t.CreatedAt,
                Date = t.Date,
                Amount = t.ReportingAmount,
                Name = db.Accounts.Where(a => a.Id == t.AccountId).Select(a => a.Name).FirstOrDefault(),
            },
            _ => t => new LedgerKey
            {
                Kind = LedgerItemKind.Transaction,
                Id = (Guid)(object)t.Id,
                CreatedAt = t.CreatedAt,
                Date = t.Date,
                Amount = t.ReportingAmount,
                Name = t.Description,
            },
        };

        Expression<Func<TransactionGroup, LedgerKey>> group = sort switch
        {
            TransactionSortField.Date => g => new LedgerKey
            {
                Kind = LedgerItemKind.Group,
                Id = (Guid)(object)g.Id,
                CreatedAt = g.CreatedAt,
                Date = filtered.Where(t => t.GroupId == g.Id).Max(t => t.Date),
                Amount = noAmount,
                Name = g.Name,
            },
            TransactionSortField.Amount => g => new LedgerKey
            {
                Kind = LedgerItemKind.Group,
                Id = (Guid)(object)g.Id,
                CreatedAt = g.CreatedAt,
                Date = noDate,
                Amount = Math.Abs(filtered
                    .Where(t => t.GroupId == g.Id)
                    .Sum(t => t.Type == FlowType.Income ? t.ReportingAmount : -t.ReportingAmount)),
                Name = g.Name,
            },
            _ => g => new LedgerKey
            {
                Kind = LedgerItemKind.Group,
                Id = (Guid)(object)g.Id,
                CreatedAt = g.CreatedAt,
                Date = noDate,
                Amount = noAmount,
                Name = g.Name,
            },
        };

        return ungrouped.Select(row).Concat(groups.Select(group));
    }

    public static IQueryable<LedgerKey> Sorted(IQueryable<LedgerKey> keys, TransactionSortField sort, bool descending) =>
        sort switch
        {
            TransactionSortField.Description => Order(keys, k => k.Name, descending),
            TransactionSortField.Category or TransactionSortField.Account => Order(keys.OrderBy(k => k.Kind), k => k.Name, descending),
            TransactionSortField.Amount => Order(keys, k => k.Amount, descending),
            _ => descending
                ? keys.OrderByDescending(k => k.Date).ThenByDescending(k => k.CreatedAt).ThenBy(k => k.Id)
                : keys.OrderBy(k => k.Date).ThenBy(k => k.CreatedAt).ThenBy(k => k.Id),
        };

    private static IOrderedQueryable<LedgerKey> Order<TKey>(
        IQueryable<LedgerKey> keys,
        Expression<Func<LedgerKey, TKey>> key,
        bool descending) =>
        (descending ? keys.OrderByDescending(key) : keys.OrderBy(key)).ThenByDescending(k => k.CreatedAt).ThenBy(k => k.Id);

    private static IOrderedQueryable<LedgerKey> Order<TKey>(
        IOrderedQueryable<LedgerKey> keys,
        Expression<Func<LedgerKey, TKey>> key,
        bool descending) =>
        (descending ? keys.ThenByDescending(key) : keys.ThenBy(key)).ThenByDescending(k => k.CreatedAt).ThenBy(k => k.Id);

    public sealed class LedgerKey
    {
        public LedgerItemKind Kind { get; init; }
        public Guid Id { get; init; }
        public DateTimeOffset CreatedAt { get; init; }
        public DateOnly Date { get; init; }
        public decimal Amount { get; init; }
        public string? Name { get; init; }
    }
}
