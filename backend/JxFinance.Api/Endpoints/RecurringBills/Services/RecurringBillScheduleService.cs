using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.RecurringBills;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.GetBillsCalendar;
using JxFinance.Endpoints.RecurringBills.GetRecurringTotals;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillScheduleService>(LifeTime.Scoped)]
public sealed class RecurringBillScheduleService(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock) : IRecurringBillScheduleService
{
    private const int CalendarMonthsAway = 12;

    public async Task<Result<BillsCalendarResponse>> GetCalendarAsync(string? month, CancellationToken cancellationToken)
    {
        var parsed = MonthKey.Parse(month);
        if (!parsed.TryGetValue(out var first))
        {
            return parsed.Error;
        }

        var today = clock.Today;
        if (Math.Abs(((first.Year - today.Year) * 12) + first.Month - today.Month) > CalendarMonthsAway)
        {
            return new DomainError(ErrorCodes.RangeInvalid, $"Choose a month at most {CalendarMonthsAway} months from the current one.");
        }

        var last = first.AddMonths(1).AddDays(-1);
        var bills = await db.RecurringBills.AsNoTracking().Where(b => b.IsActive).ToListAsync(cancellationToken);
        var currencies = await AccountCurrenciesAsync(cancellationToken);
        var occurrences = bills.SelectMany(bill => Scheduled(bill, first, last)).ToList();
        var lookBack = today.AddMonths(-RecurringEstimate.LookBackMonths);
        var loadFrom = first.AddDays(-RecurringMatch.PaidToleranceDays);
        var loadTo = last.AddDays(RecurringMatch.PaidToleranceDays);
        var rows = await RecurringHistory.LoadAsync(
            db,
            bills,
            loadFrom < lookBack ? loadFrom : lookBack,
            loadTo > today ? loadTo : today,
            cancellationToken);
        var paid = RecurringMatch.Assign(occurrences, rows);
        var table = await FreshRatesAsync(today, cancellationToken);
        var expected = bills.ToDictionary(bill => bill, bill => Expected(bill, currencies, rows, lookBack, today));

        decimal expectedOut = 0m, expectedIn = 0m, paidOut = 0m;
        var partial = false;
        var unpriced = new HashSet<RecurringBillId>();
        var result = new List<BillOccurrence>(occurrences.Count);
        foreach (var occurrence in occurrences)
        {
            var bill = occurrence.Bill;
            var amount = expected[bill];
            var row = paid.GetValueOrDefault(occurrence);
            var scheduled = occurrence.Date >= bill.NextDueDate;
            if (bill.Shape != RecurringBillShape.Transfer)
            {
                var converted = amount is null ? null : table.Convert(amount.Amount, amount.Currency, rates.ReportingCurrency);
                if (amount is null)
                {
                    unpriced.Add(bill.Id);
                }
                else if (converted is not { } reporting)
                {
                    partial = true;
                }
                else
                {
                    partial |= amount.Estimated;
                    expectedOut += bill.Shape == RecurringBillShape.Expense ? reporting : 0m;
                    expectedIn += bill.Shape == RecurringBillShape.Income ? reporting : 0m;
                }

                paidOut += bill.Shape == RecurringBillShape.Expense ? row?.ReportingAmount ?? 0m : 0m;
            }

            result.Add(new BillOccurrence(
                occurrence.Date,
                bill.Id.Value,
                bill.Name,
                bill.Shape,
                row?.Amount ?? amount?.Amount,
                row?.Currency ?? amount?.Currency,
                row is null && amount is { Estimated: true },
                StatusOf(occurrence, row, scheduled, today),
                occurrence.Date == bill.NextDueDate,
                row is not null && scheduled,
                bill.AccountId is { } accountId && !currencies.ContainsKey(accountId),
                (row?.AccountId ?? bill.AccountId)?.Value,
                row?.TransactionId));
        }

        return new BillsCalendarResponse(
            first,
            last,
            expectedOut,
            expectedIn,
            paidOut,
            partial,
            unpriced.Count,
            [.. result
                .OrderBy(o => o.Date)
                .ThenBy(o => o.Name, StringComparer.CurrentCultureIgnoreCase)
                .ThenBy(o => o.BillId)]);
    }

    public async Task<RecurringTotalsResponse> GetTotalsAsync(CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var bills = await db.RecurringBills
            .AsNoTracking()
            .Where(b => b.IsActive && b.Shape != RecurringBillShape.Transfer)
            .ToListAsync(cancellationToken);
        var currencies = await AccountCurrenciesAsync(cancellationToken);
        var from = today.AddMonths(-RecurringLapse.LookBackMonths);
        var to = today.AddDays(RecurringMatch.PaidToleranceDays);
        var occurrences = bills.SelectMany(bill => Scheduled(bill, from, to)).ToList();
        var rows = await RecurringHistory.LoadAsync(db, bills, from.AddDays(-RecurringMatch.PaidToleranceDays), to, cancellationToken);
        var paid = RecurringMatch.Assign(occurrences, rows);
        var table = await FreshRatesAsync(today, cancellationToken);
        var lookBack = today.AddMonths(-RecurringEstimate.LookBackMonths);

        decimal yearlyOut = 0m, yearlyIn = 0m;
        var partial = false;
        var unpriced = 0;
        foreach (var bill in bills)
        {
            var amount = Expected(bill, currencies, rows, lookBack, today);
            if (amount is null)
            {
                unpriced++;
                continue;
            }

            if (table.Convert(amount.Amount, amount.Currency, rates.ReportingCurrency) is not { } reporting)
            {
                partial = true;
                continue;
            }

            partial |= amount.Estimated;
            var perYear = RecurringCost.PerYear(reporting, bill.Cadence);
            yearlyOut += bill.Shape == RecurringBillShape.Expense ? perYear : 0m;
            yearlyIn += bill.Shape == RecurringBillShape.Income ? perYear : 0m;
        }

        var possiblyCancelled = bills
            .Where(bill => bill.Shape == RecurringBillShape.Expense
                && RecurringLapse.PossiblyCancelled(occurrences.Where(occurrence => occurrence.Bill == bill), paid, today))
            .Select(bill => bill.Id.Value)
            .ToList();

        return new RecurringTotalsResponse(
            Money.Round(yearlyOut / RecurringCost.MonthsPerYear),
            Money.Round(yearlyOut),
            Money.Round(yearlyIn / RecurringCost.MonthsPerYear),
            Money.Round(yearlyIn),
            partial,
            unpriced,
            possiblyCancelled);
    }

    private Task<Dictionary<AccountId, Currency>> AccountCurrenciesAsync(CancellationToken cancellationToken) =>
        db.Accounts
            .AsNoTracking()
            .Select(a => new { a.Id, a.StartingBalance.Currency })
            .ToDictionaryAsync(a => a.Id, a => a.Currency, cancellationToken);

    private async Task<RateTable> FreshRatesAsync(DateOnly today, CancellationToken cancellationToken)
    {
        var latest = await rates.GetLatestAsync(cancellationToken);
        return rates.IsFresh(latest, today) ? latest : RateTable.Empty;
    }

    private IEnumerable<ScheduledOccurrence> Scheduled(RecurringBill bill, DateOnly first, DateOnly last)
    {
        var createdOn = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(bill.CreatedAt, clock.TimeZone).DateTime);
        return RecurringOccurrences.Before(bill, first, last, createdOn)
            .Concat(RecurringOccurrences.After(bill, first, last))
            .Select(date => new ScheduledOccurrence(bill, date));
    }

    private static ExpectedAmount? Expected(
        RecurringBill bill,
        Dictionary<AccountId, Currency> currencies,
        List<RecurringRow> rows,
        DateOnly lookBack,
        DateOnly today)
    {
        if (bill.AccountId is not { } accountId || !currencies.TryGetValue(accountId, out var currency))
        {
            return null;
        }

        if (bill.Kind == RecurringBillKind.Fixed)
        {
            return bill.Amount is { } amount ? new ExpectedAmount(amount, currency, false) : null;
        }

        var keys = PriceRiseMatcher.KeysOf(bill);
        var estimate = RecurringEstimate.Of(rows
            .Where(row => row.Date >= lookBack && row.Date <= today && row.Currency == currency && RecurringMatch.Pays(bill, keys, row))
            .Select(row => (row.Date, row.Amount)));
        return estimate is { } value ? new ExpectedAmount(value, currency, true) : null;
    }

    private static BillOccurrenceStatus StatusOf(ScheduledOccurrence occurrence, RecurringRow? row, bool scheduled, DateOnly today)
    {
        if (row is not null)
        {
            return BillOccurrenceStatus.Paid;
        }

        if (occurrence.Date >= today)
        {
            return BillOccurrenceStatus.Due;
        }

        return scheduled ? BillOccurrenceStatus.Overdue : BillOccurrenceStatus.NoMatch;
    }

    private sealed record ExpectedAmount(decimal Amount, Currency Currency, bool Estimated);
}
