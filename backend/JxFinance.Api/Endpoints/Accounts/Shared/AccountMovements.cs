using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountMovement(AccountId AccountId, Currency Currency, decimal Amount);

public sealed record DatedAccountMovement(AccountId AccountId, Currency Currency, DateOnly Date, decimal Amount);

public static class AccountMovements
{
    public static Task<List<AccountMovement>> SumAsync(
        AppDbContext db,
        IReadOnlyList<AccountId> ids,
        DateOnly? until,
        CancellationToken cancellationToken) =>
        Movements(db, ids, null, until)
            .GroupBy(m => new { m.AccountId, m.Currency })
            .Select(g => new AccountMovement(g.Key.AccountId, g.Key.Currency, g.Sum(m => m.Amount)))
            .ToListAsync(cancellationToken);

    public static Task<List<DatedAccountMovement>> SumByDateAsync(
        AppDbContext db,
        IReadOnlyList<AccountId> ids,
        DateOnly after,
        DateOnly until,
        CancellationToken cancellationToken) =>
        Movements(db, ids, after, until)
            .GroupBy(m => new { m.AccountId, m.Currency, m.Date })
            .Select(g => new DatedAccountMovement(g.Key.AccountId, g.Key.Currency, g.Key.Date, g.Sum(m => m.Amount)))
            .ToListAsync(cancellationToken);

    private static IQueryable<Movement> Movements(
        AppDbContext db,
        IReadOnlyList<AccountId> ids,
        DateOnly? after,
        DateOnly? until) =>
        db.Transactions
            .Where(t => ids.Contains(t.AccountId) && (after == null || t.Date > after) && (until == null || t.Date <= until))
            .Select(t => new Movement
            {
                AccountId = t.AccountId,
                Currency = t.Amount.Currency,
                Date = t.Date,
                Amount = t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount,
            })
            .Concat(db.Transfers
                .Where(t => ids.Contains(t.FromAccountId) && (after == null || t.Date > after) && (until == null || t.Date <= until))
                .Select(t => new Movement { AccountId = t.FromAccountId, Currency = t.Amount.Currency, Date = t.Date, Amount = -t.Amount.Amount }))
            .Concat(db.Transfers
                .Where(t => ids.Contains(t.ToAccountId) && (after == null || t.Date > after) && (until == null || t.Date <= until))
                .Select(t => new Movement { AccountId = t.ToAccountId, Currency = t.ReceivedAmount.Currency, Date = t.Date, Amount = t.ReceivedAmount.Amount }))
            .Concat(db.CurrencyConversions
                .Where(c => ids.Contains(c.AccountId) && (after == null || c.Date > after) && (until == null || c.Date <= until))
                .Select(c => new Movement { AccountId = c.AccountId, Currency = c.FromAmount.Currency, Date = c.Date, Amount = -c.FromAmount.Amount }))
            .Concat(db.CurrencyConversions
                .Where(c => ids.Contains(c.AccountId) && (after == null || c.Date > after) && (until == null || c.Date <= until))
                .Select(c => new Movement { AccountId = c.AccountId, Currency = c.ToAmount.Currency, Date = c.Date, Amount = c.ToAmount.Amount }))
            .Concat(db.InvestmentTransactions
                .Where(t => ids.Contains(t.AccountId) && (after == null || t.Date > after) && (until == null || t.Date <= until))
                .Select(t => new Movement { AccountId = t.AccountId, Currency = t.CashAmount.Currency, Date = t.Date, Amount = t.CashAmount.Amount }));

    private sealed class Movement
    {
        public AccountId AccountId { get; init; }
        public Currency Currency { get; init; }
        public DateOnly Date { get; init; }
        public decimal Amount { get; init; }
    }
}
