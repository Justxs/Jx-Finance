using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountMovement(AccountId AccountId, Currency Currency, decimal Amount);

public sealed record DatedAccountMovement(AccountId AccountId, Currency Currency, DateOnly Date, decimal Amount);

public enum AccountMovementKind
{
    Transaction,
    TransferOut,
    TransferIn,
    Conversion,
    InvestmentEntry,
}

public sealed record AccountMovementRow(
    AccountMovementKind Kind,
    Guid Id,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount);

public static class AccountMovements
{
    public static async Task<decimal> LedgerBalanceOnAsync(
        AppDbContext db,
        AccountId accountId,
        Money startingBalance,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var moved = await SumAsync(db, [accountId], date, cancellationToken);
        return startingBalance.Amount + moved.Where(m => m.Currency == startingBalance.Currency).Sum(m => m.Amount);
    }

    public static async Task<(IReadOnlyList<AccountMovementRow> Rows, int Count)> ListAsync(
        AppDbContext db,
        AccountId accountId,
        Currency currency,
        DateOnly? after,
        DateOnly until,
        int limit,
        CancellationToken cancellationToken)
    {
        var rows = Rows(db, accountId, currency, after, until);
        var page = await rows
            .OrderByDescending(r => r.Date)
            .ThenBy(r => r.Kind)
            .ThenBy(r => r.Id)
            .Take(limit)
            .Select(r => new AccountMovementRow(r.Kind, r.Id, r.Date, r.Description, r.Amount))
            .ToListAsync(cancellationToken);
        return (page, page.Count < limit ? page.Count : await rows.CountAsync(cancellationToken));
    }

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

    private static IQueryable<MovementRow> Rows(
        AppDbContext db,
        AccountId accountId,
        Currency currency,
        DateOnly? after,
        DateOnly until) =>
        db.Transactions
            .Where(t => t.AccountId == accountId && t.Amount.Currency == currency && (after == null || t.Date > after) && t.Date <= until)
            .Select(t => new MovementRow
            {
                Kind = AccountMovementKind.Transaction,
                Id = (Guid)(object)t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount,
            })
            .Concat(db.Transfers
                .Where(t => t.FromAccountId == accountId && t.Amount.Currency == currency && (after == null || t.Date > after) && t.Date <= until)
                .Select(t => new MovementRow
                {
                    Kind = AccountMovementKind.TransferOut,
                    Id = (Guid)(object)t.Id,
                    Date = t.Date,
                    Description = t.Description,
                    Amount = -t.Amount.Amount,
                }))
            .Concat(db.Transfers
                .Where(t => t.ToAccountId == accountId && t.ReceivedAmount.Currency == currency && (after == null || t.Date > after) && t.Date <= until)
                .Select(t => new MovementRow
                {
                    Kind = AccountMovementKind.TransferIn,
                    Id = (Guid)(object)t.Id,
                    Date = t.Date,
                    Description = t.Description,
                    Amount = t.ReceivedAmount.Amount,
                }))
            .Concat(db.CurrencyConversions
                .Where(c => c.AccountId == accountId && c.FromAmount.Currency == currency && (after == null || c.Date > after) && c.Date <= until)
                .Select(c => new MovementRow
                {
                    Kind = AccountMovementKind.Conversion,
                    Id = (Guid)(object)c.Id,
                    Date = c.Date,
                    Description = c.Description,
                    Amount = -c.FromAmount.Amount,
                }))
            .Concat(db.CurrencyConversions
                .Where(c => c.AccountId == accountId && c.ToAmount.Currency == currency && (after == null || c.Date > after) && c.Date <= until)
                .Select(c => new MovementRow
                {
                    Kind = AccountMovementKind.Conversion,
                    Id = (Guid)(object)c.Id,
                    Date = c.Date,
                    Description = c.Description,
                    Amount = c.ToAmount.Amount,
                }))
            .Concat(db.InvestmentTransactions
                .Where(t => t.AccountId == accountId && t.CashAmount.Currency == currency && (after == null || t.Date > after) && t.Date <= until)
                .Select(t => new MovementRow
                {
                    Kind = AccountMovementKind.InvestmentEntry,
                    Id = (Guid)(object)t.Id,
                    Date = t.Date,
                    Description = t.Description,
                    Amount = t.CashAmount.Amount,
                }));

    private sealed class MovementRow
    {
        public AccountMovementKind Kind { get; init; }
        public Guid Id { get; init; }
        public DateOnly Date { get; init; }
        public string? Description { get; init; }
        public decimal Amount { get; init; }
    }

    private sealed class Movement
    {
        public AccountId AccountId { get; init; }
        public Currency Currency { get; init; }
        public DateOnly Date { get; init; }
        public decimal Amount { get; init; }
    }
}
