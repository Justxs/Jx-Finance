using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record AccountMovement(AccountId AccountId, Currency Currency, decimal Amount);

public static class AccountMovements
{
    public static Task<List<AccountMovement>> SumAsync(
        AppDbContext db,
        IReadOnlyList<AccountId> ids,
        CancellationToken cancellationToken) =>
        db.Transactions
            .Where(t => ids.Contains(t.AccountId))
            .Select(t => new
            {
                t.AccountId,
                t.Amount.Currency,
                Amount = t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount,
            })
            .Concat(db.Transfers
                .Where(t => ids.Contains(t.FromAccountId))
                .Select(t => new { AccountId = t.FromAccountId, t.Amount.Currency, Amount = -t.Amount.Amount }))
            .Concat(db.Transfers
                .Where(t => ids.Contains(t.ToAccountId))
                .Select(t => new { AccountId = t.ToAccountId, t.ReceivedAmount.Currency, Amount = t.ReceivedAmount.Amount }))
            .Concat(db.CurrencyConversions
                .Where(c => ids.Contains(c.AccountId))
                .Select(c => new { c.AccountId, c.FromAmount.Currency, Amount = -c.FromAmount.Amount }))
            .Concat(db.CurrencyConversions
                .Where(c => ids.Contains(c.AccountId))
                .Select(c => new { c.AccountId, c.ToAmount.Currency, Amount = c.ToAmount.Amount }))
            .Concat(db.InvestmentTransactions
                .Where(t => ids.Contains(t.AccountId))
                .Select(t => new { t.AccountId, t.CashAmount.Currency, Amount = t.CashAmount.Amount }))
            .GroupBy(m => new { m.AccountId, m.Currency })
            .Select(g => new AccountMovement(g.Key.AccountId, g.Key.Currency, g.Sum(m => m.Amount)))
            .ToListAsync(cancellationToken);
}
