using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.ExchangeRates;

[RegisterService<IReportingRevaluation>(LifeTime.Scoped)]
public sealed class ReportingRevaluation(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock,
    IOptions<AppOptions> options) : IReportingRevaluation
{
    private const string LockRevaluedTables =
        "LOCK TABLE \"Transactions\", \"InvestmentTransactions\" IN SHARE ROW EXCLUSIVE MODE";

    public Task LockAsync(CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlRawAsync(LockRevaluedTables, cancellationToken);

    public async Task<string?> RevalueAsync(
        IQueryable<Transaction> transactions,
        IQueryable<InvestmentTransaction> entries,
        Currency reportingCurrency,
        CancellationToken cancellationToken) =>
        await RevalueInBatchesAsync<Transaction, TransactionId>(
            (after, size) => (after is { } last ? transactions.Where(t => t.Id > last) : transactions).OrderBy(t => t.Id).Take(size),
            t => t.Id,
            t => (t.Amount, t.Date),
            (t, value) => t.ReportingAmount = value,
            reportingCurrency,
            cancellationToken)
        ?? await RevalueInBatchesAsync<InvestmentTransaction, InvestmentTransactionId>(
            (after, size) => (after is { } last ? entries.Where(t => t.Id > last) : entries).OrderBy(t => t.Id).Take(size),
            t => t.Id,
            t => (t.CashAmount, t.Date),
            (t, value) => t.ReportingAmount = value,
            reportingCurrency,
            cancellationToken);

    public async Task<string?> ConvertPlansAsync(Currency from, Currency to, CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.IgnoreQueryFilters().ToListAsync(cancellationToken);
        var goals = await db.Goals.IgnoreQueryFilters().ToListAsync(cancellationToken);
        if (budgets.Count == 0 && goals.Count == 0)
        {
            return null;
        }

        var today = clock.Today;
        var table = await rates.GetForDateAsync(today, cancellationToken);
        if (!rates.IsFresh(table, today) || table.Rate(from, to) is not { } rate)
        {
            return $"No exchange rate is available for {from.ToCode()} to {to.ToCode()} on {today:yyyy-MM-dd}. Sync exchange rates and try again.";
        }

        foreach (var budget in budgets)
        {
            budget.LimitAmount = new Money(Money.Round(budget.LimitAmount.Amount * rate), to);
        }

        foreach (var goal in goals)
        {
            goal.TargetAmount = new Money(Money.Round(goal.TargetAmount.Amount * rate), to);
            goal.CurrentAmount = new Money(Money.Round(goal.CurrentAmount.Amount * rate), to);
        }

        await db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task<string?> RevalueInBatchesAsync<T, TId>(
        Func<TId?, int, IQueryable<T>> page,
        Func<T, TId> keyOf,
        Func<T, (Money Amount, DateOnly Date)> read,
        Action<T, decimal> write,
        Currency reportingCurrency,
        CancellationToken cancellationToken)
        where T : class
        where TId : struct
    {
        var batchSize = options.Value.RevalueBatchSize;
        TId? after = null;
        while (true)
        {
            var batch = await page(after, batchSize).ToListAsync(cancellationToken);
            if (batch.Count == 0)
            {
                return null;
            }

            foreach (var row in batch)
            {
                var (amount, date) = read(row);
                var value = await rates.ConvertAsync(amount, reportingCurrency, date, cancellationToken);
                if (value.IsFailure)
                {
                    return value.ErrorMessage;
                }

                write(row, value.Value);
            }

            after = keyOf(batch[^1]);
            await db.SaveChangesAsync(cancellationToken);
            foreach (var row in batch)
            {
                db.Entry(row).State = EntityState.Detached;
            }
        }
    }
}
