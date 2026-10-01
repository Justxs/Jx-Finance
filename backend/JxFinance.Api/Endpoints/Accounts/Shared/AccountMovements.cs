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
    public static decimal BalanceOf(Money startingBalance, IEnumerable<AccountMovement> moved) =>
        startingBalance.Amount + moved.Where(m => m.Currency == startingBalance.Currency).Sum(m => m.Amount);

    public static Money StartingIn(Money startingBalance, Currency currency) =>
        startingBalance.Currency == currency ? startingBalance : new Money(0m, currency);

    public static async Task<decimal> LedgerBalanceOnAsync(
        AppDbContext db,
        AccountId accountId,
        Money startingBalance,
        Currency currency,
        DateOnly date,
        CancellationToken cancellationToken) =>
        BalanceOf(StartingIn(startingBalance, currency), await SumAsync(db, [accountId], date, cancellationToken));

    public static async Task<(IReadOnlyList<AccountMovementRow> Rows, int Count)> ListAsync(
        AppDbContext db,
        AccountId accountId,
        Currency currency,
        DateOnly? after,
        DateOnly until,
        int limit,
        CancellationToken cancellationToken)
    {
        var rows = Between(Rows(db).Where(r => r.AccountId == accountId && r.Currency == currency), after, until);
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
        Between(Rows(db).Where(r => ids.Contains(r.AccountId)), null, until)
            .GroupBy(r => new { r.AccountId, r.Currency })
            .Select(g => new AccountMovement(g.Key.AccountId, g.Key.Currency, g.Sum(r => r.Amount)))
            .ToListAsync(cancellationToken);

    public static Task<List<DatedAccountMovement>> SumByDateAsync(
        AppDbContext db,
        IReadOnlyList<AccountId> ids,
        DateOnly after,
        DateOnly until,
        CancellationToken cancellationToken) =>
        Between(Rows(db).Where(r => ids.Contains(r.AccountId)), after, until)
            .GroupBy(r => new { r.AccountId, r.Currency, r.Date })
            .Select(g => new DatedAccountMovement(g.Key.AccountId, g.Key.Currency, g.Key.Date, g.Sum(r => r.Amount)))
            .ToListAsync(cancellationToken);

    private static IQueryable<MovementRow> Between(IQueryable<MovementRow> rows, DateOnly? after, DateOnly? until) =>
        rows.Where(r => (after == null || r.Date > after) && (until == null || r.Date <= until));

    private static IQueryable<MovementRow> Rows(AppDbContext db) =>
        db.Transactions
            .Select(t => new MovementRow
            {
                AccountId = t.AccountId,
                Currency = t.Amount.Currency,
                Kind = AccountMovementKind.Transaction,
                Id = (Guid)(object)t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount,
            })
            .Concat(db.Transfers.Select(t => new MovementRow
            {
                AccountId = t.FromAccountId,
                Currency = t.Amount.Currency,
                Kind = AccountMovementKind.TransferOut,
                Id = (Guid)(object)t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = -t.Amount.Amount,
            }))
            .Concat(db.Transfers.Select(t => new MovementRow
            {
                AccountId = t.ToAccountId,
                Currency = t.ReceivedAmount.Currency,
                Kind = AccountMovementKind.TransferIn,
                Id = (Guid)(object)t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = t.ReceivedAmount.Amount,
            }))
            .Concat(db.CurrencyConversions.Select(c => new MovementRow
            {
                AccountId = c.AccountId,
                Currency = c.FromAmount.Currency,
                Kind = AccountMovementKind.Conversion,
                Id = (Guid)(object)c.Id,
                Date = c.Date,
                Description = c.Description,
                Amount = -c.FromAmount.Amount,
            }))
            .Concat(db.CurrencyConversions.Select(c => new MovementRow
            {
                AccountId = c.AccountId,
                Currency = c.ToAmount.Currency,
                Kind = AccountMovementKind.Conversion,
                Id = (Guid)(object)c.Id,
                Date = c.Date,
                Description = c.Description,
                Amount = c.ToAmount.Amount,
            }))
            .Concat(db.InvestmentTransactions.Select(t => new MovementRow
            {
                AccountId = t.AccountId,
                Currency = t.CashAmount.Currency,
                Kind = AccountMovementKind.InvestmentEntry,
                Id = (Guid)(object)t.Id,
                Date = t.Date,
                Description = t.Description,
                Amount = t.CashAmount.Amount,
            }));

    private sealed class MovementRow
    {
        public AccountId AccountId { get; init; }
        public Currency Currency { get; init; }
        public AccountMovementKind Kind { get; init; }
        public Guid Id { get; init; }
        public DateOnly Date { get; init; }
        public string? Description { get; init; }
        public decimal Amount { get; init; }
    }
}
