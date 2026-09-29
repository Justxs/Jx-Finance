using FastEndpoints;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.Accounts.GetCashFlowForecast;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Accounts.Services;

[RegisterService<ICashFlowForecastService>(LifeTime.Scoped)]
public sealed class CashFlowForecastService(AppDbContext db, IExchangeRateService rates, IClock clock)
    : ICashFlowForecastService
{
    public async Task<CashFlowForecastResponse> GetAsync(int days, CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var end = today.AddDays(days);
        var accounts = await db.Accounts.AsNoTracking().ToDictionaryAsync(a => a.Id, cancellationToken);
        var ids = accounts.Keys.ToList();
        var bills = await db.RecurringBills
            .AsNoTracking()
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .ToListAsync(cancellationToken);

        var held = await AccountMovements.SumAsync(db, ids, today, cancellationToken);
        var future = await AccountMovements.SumByDateAsync(db, ids, today, end, cancellationToken);
        var history = await HistoryAsync(ids, today, cancellationToken);
        var usual = await UsualDailySpendingAsync(accounts.Values, bills, today, cancellationToken);
        var table = await rates.GetLatestAsync(cancellationToken);
        var fresh = rates.IsFresh(table, today);

        var changes = ids.ToDictionary(
            id => id,
            id => future
                .Where(m => m.AccountId == id && m.Currency == accounts[id].Currency && m.Amount != 0m)
                .Select(m => new ForecastEntryResponse(m.Date, ForecastEntrySource.Ledger, null, null, null, m.Amount, false, false, 0m))
                .ToList());
        var notCounted = new List<ForecastSkippedEntry>();

        foreach (var bill in bills)
        {
            if (bill.AccountId is not { } accountId)
            {
                notCounted.Add(new ForecastSkippedEntry(bill.Id.Value, bill.Name, ForecastSkipReason.NoAccount));
                continue;
            }

            if (!accounts.TryGetValue(accountId, out var account))
            {
                notCounted.Add(new ForecastSkippedEntry(bill.Id.Value, bill.Name, ForecastSkipReason.AccountNotVisible));
                continue;
            }

            var matches = history.Where(row => Matches(bill, account.Currency, row)).ToList();
            var amount = bill.Kind == RecurringBillKind.Fixed
                ? bill.Amount
                : CashFlowProjection.Estimate(matches.Select(row => (row.Date, row.Amount)));
            if (amount is not { } value)
            {
                notCounted.Add(new ForecastSkippedEntry(bill.Id.Value, bill.Name, ForecastSkipReason.NoHistory));
                continue;
            }

            var estimated = bill.Kind == RecurringBillKind.Variable;
            var received = Received(bill, account, value, accounts, fresh ? table : RateTable.Empty);
            if (received is { Amount: null })
            {
                notCounted.Add(new ForecastSkippedEntry(bill.Id.Value, bill.Name, ForecastSkipReason.NoExchangeRate));
            }

            foreach (var occurrence in CashFlowProjection.Occurrences(bill, today, end, matches.Select(row => row.Date)))
            {
                changes[accountId].Add(Entry(bill, occurrence, bill.Shape == RecurringBillShape.Income ? value : -value, estimated));
                if (received is { Amount: { } arrived } arrival)
                {
                    changes[arrival.Account].Add(Entry(bill, occurrence, arrived, estimated || arrival.Converted));
                }
            }
        }

        var forecasts = ids
            .Where(id => changes[id].Count > 0)
            .Select(id => Forecast(accounts[id], held, changes[id], usual.GetValueOrDefault(id), today, end))
            .OrderBy(f => f.BelowZeroOn is null && f.BelowZeroWithSpendingOn is null)
            .ThenBy(f => f.AccountName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new CashFlowForecastResponse(today, end, forecasts, notCounted);
    }

    private static AccountForecastResponse Forecast(
        Account account,
        IReadOnlyList<AccountMovement> held,
        IEnumerable<ForecastEntryResponse> changes,
        decimal? dailySpending,
        DateOnly today,
        DateOnly end)
    {
        var own = held.Where(m => m.AccountId == account.Id).ToList();
        var start = AccountMovements.BalanceOf(account.StartingBalance, own);
        var projection = CashFlowProjection.Project(start, changes, dailySpending, today, end);

        return new AccountForecastResponse(
            account.Id.Value,
            account.Name,
            account.Currency,
            start,
            dailySpending,
            projection.LowestBalance,
            projection.LowestOn,
            projection.BelowZeroOn,
            projection.BelowZeroWithSpendingOn,
            own.Any(m => m.Currency != account.Currency && m.Amount != 0m),
            projection.Entries);
    }

    private static ForecastEntryResponse Entry(RecurringBill bill, ForecastOccurrence occurrence, decimal amount, bool estimated) =>
        new(occurrence.Date, ForecastEntrySource.Recurring, bill.Id.Value, bill.Name, bill.Shape, amount, estimated, occurrence.Overdue, 0m);

    private static (AccountId Account, decimal? Amount, bool Converted)? Received(
        RecurringBill bill,
        Account source,
        decimal amount,
        Dictionary<AccountId, Account> accounts,
        RateTable table)
    {
        if (bill.Shape != RecurringBillShape.Transfer
            || bill.ToAccountId is not { } toAccountId
            || !accounts.TryGetValue(toAccountId, out var destination))
        {
            return null;
        }

        return (toAccountId, table.Convert(amount, source.Currency, destination.Currency), destination.Currency != source.Currency);
    }

    private static bool Matches(RecurringBill bill, Currency currency, HistoryRow row) =>
        row.Shape == bill.Shape
        && row.AccountId == bill.AccountId
        && row.ToAccountId == (bill.Shape == RecurringBillShape.Transfer ? bill.ToAccountId : null)
        && row.Currency == currency
        && KeysOf(bill).Contains(row.Key);

    private static string[] KeysOf(RecurringBill bill) =>
        new[] { PriceRiseMatcher.KeyOf(bill.MatchKey, bill.Name), SubscriptionDescription.Normalize(bill.Name) }
            .Where(key => key.Length > 0)
            .ToArray();

    private async Task<List<HistoryRow>> HistoryAsync(
        IReadOnlyList<AccountId> ids,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var expenses = await PriceRiseMatcher.LoadChargesAsync(db.Transactions, ids, today, FlowType.Expense, cancellationToken);
        var income = await PriceRiseMatcher.LoadChargesAsync(db.Transactions, ids, today, FlowType.Income, cancellationToken);
        var from = today.AddMonths(-CashFlowProjection.EstimateLookBackMonths);
        var transfers = await db.Transfers
            .AsNoTracking()
            .Where(t => ids.Contains(t.FromAccountId) && t.Description != null && t.Date >= from)
            .Select(t => new { t.FromAccountId, t.ToAccountId, t.Date, t.Amount.Amount, t.Amount.Currency, t.Description })
            .ToListAsync(cancellationToken);

        return expenses.Select(c => HistoryRow.Of(RecurringBillShape.Expense, c))
            .Concat(income.Select(c => HistoryRow.Of(RecurringBillShape.Income, c)))
            .Concat(transfers.Select(t => new HistoryRow(
                RecurringBillShape.Transfer,
                t.FromAccountId,
                t.ToAccountId,
                t.Date,
                t.Amount,
                t.Currency,
                SubscriptionDescription.Normalize(t.Description))))
            .ToList();
    }

    private async Task<Dictionary<AccountId, decimal?>> UsualDailySpendingAsync(
        IEnumerable<Account> accounts,
        IReadOnlyList<RecurringBill> bills,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var from = monthStart.AddMonths(-CashFlowProjection.UsualSpendingMonths);
        var ids = accounts.Select(a => a.Id).ToList();
        var firstRows = await db.Transactions
            .Where(t => ids.Contains(t.AccountId))
            .GroupBy(t => t.AccountId)
            .Select(g => new { AccountId = g.Key, First = g.Min(t => t.Date) })
            .ToDictionaryAsync(g => g.AccountId, g => g.First, cancellationToken);
        var spent = await db.Transactions
            .Where(t => ids.Contains(t.AccountId) && t.Type == FlowType.Expense && t.Date >= from && t.Date < monthStart)
            .GroupBy(t => new { t.AccountId, t.Amount.Currency, t.Date.Year, t.Date.Month, t.PayeeKey })
            .Select(g => new { g.Key.AccountId, g.Key.Currency, g.Key.Year, g.Key.Month, g.Key.PayeeKey, Total = g.Sum(t => t.Amount.Amount) })
            .ToListAsync(cancellationToken);

        return accounts.ToDictionary(
            account => account.Id,
            account =>
            {
                if (!firstRows.TryGetValue(account.Id, out var first) || first > from)
                {
                    return null;
                }

                var scheduled = bills
                    .Where(b => b.AccountId == account.Id && b.Shape == RecurringBillShape.Expense)
                    .SelectMany(KeysOf)
                    .ToHashSet(StringComparer.Ordinal);
                var totals = Enumerable.Range(0, CashFlowProjection.UsualSpendingMonths)
                    .Select(offset => from.AddMonths(offset))
                    .Select(month => (month, spent
                        .Where(s => s.AccountId == account.Id
                            && s.Currency == account.Currency
                            && s.Year == month.Year
                            && s.Month == month.Month
                            && !scheduled.Contains(s.PayeeKey ?? string.Empty))
                        .Sum(s => s.Total)))
                    .ToList();
                return CashFlowProjection.UsualDailySpending(totals);
            });
    }

    private sealed record HistoryRow(
        RecurringBillShape Shape,
        AccountId AccountId,
        AccountId? ToAccountId,
        DateOnly Date,
        decimal Amount,
        Currency Currency,
        string Key)
    {
        public static HistoryRow Of(RecurringBillShape shape, BankCharge charge) =>
            new(shape, charge.AccountId, null, charge.Date, charge.Amount, charge.Currency, charge.Key);
    }
}
