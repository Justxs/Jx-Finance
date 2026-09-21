using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.ExchangeRates;

[RegisterService<IExchangeRateService>(LifeTime.Scoped)]
public sealed class ExchangeRateService(
    AppDbContext db,
    IExchangeRateProvider provider,
    ExchangeRateFetchLog fetchLog,
    IClock clock,
    IInstanceSettingsStore settings,
    ILogger<ExchangeRateService> logger) : IExchangeRateService
{
    private const int MaxGapDays = 5;
    private const int FetchWindowDays = 10;
    private const int InitialSyncDays = 30;
    private const int RangeChunkDays = 90;

    private readonly Dictionary<DateOnly, RateTable> tables = [];

    public Currency ReportingCurrency => settings.Current.ReportingCurrency;

    public string? UnusableReason(params Currency[] currencies) =>
        currencies.Except(settings.Current.UsableCurrencies).Select(c => (Currency?)c).FirstOrDefault() is { } unusable
            ? $"{unusable.ToCode()} is not enabled for this installation."
            : null;

    private DateOnly Today => clock.Today;

    public Task<RateTable> GetLatestAsync(CancellationToken cancellationToken) =>
        GetForDateAsync(Today, cancellationToken);

    public async Task<RateTable> GetForDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var target = date > Today ? Today : date;
        if (tables.TryGetValue(target, out var cached))
        {
            return cached;
        }

        var table = await LoadAsync(target, cancellationToken);
        if (IsStale(table, target) && await FetchAsync(target.AddDays(-FetchWindowDays), target, false, cancellationToken) > 0)
        {
            table = await LoadAsync(target, cancellationToken);
        }

        tables[target] = table;
        return table;
    }

    public async Task<RateHistory> GetHistoryAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var rates = await db.ExchangeRates
            .AsNoTracking()
            .Where(r => r.Date <= to
                && r.Date >= (db.ExchangeRates.Where(x => x.Date <= from).Max(x => (DateOnly?)x.Date) ?? from))
            .ToListAsync(cancellationToken);
        return new RateHistory(rates);
    }

    public Task<Result<decimal>> ToReportingAsync(Money amount, DateOnly date, CancellationToken cancellationToken) =>
        ConvertAsync(amount, ReportingCurrency, date, cancellationToken);

    public async Task<Result<decimal>> ConvertAsync(
        Money amount,
        Currency to,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        if (amount.Currency == to)
        {
            return amount.Amount;
        }

        var table = await GetForDateAsync(date, cancellationToken);
        return !IsStale(table, date) && table.Convert(amount.Amount, amount.Currency, to) is { } converted
            ? converted
            : new DomainError(
                ErrorCodes.ExchangeRateUnavailable,
                $"No exchange rate is available for {amount.Currency.ToCode()} to {to.ToCode()} on {date:yyyy-MM-dd}. Sync exchange rates and try again.");
    }

    public async Task<int> SyncAsync(bool force, CancellationToken cancellationToken)
    {
        var today = Today;
        var latest = await LatestDateOnOrBeforeAsync(today, cancellationToken);
        var from = latest?.AddDays(1) ?? today.AddDays(-InitialSyncDays);
        return from > today ? 0 : await FetchAsync(from, today, force, cancellationToken);
    }

    public async Task EnsureRangeAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var end = to > Today ? Today : to;
        for (var start = from.AddDays(-FetchWindowDays); start <= end; start = start.AddDays(RangeChunkDays))
        {
            var chunkEnd = start.AddDays(RangeChunkDays - 1);
            await FetchAsync(start, chunkEnd > end ? end : chunkEnd, true, cancellationToken);
        }
    }

    private bool IsStale(RateTable table, DateOnly date) =>
        table.AsOf is not { } asOf || (date > Today ? Today : date).DayNumber - asOf.DayNumber > MaxGapDays;

    private Task<DateOnly?> LatestDateOnOrBeforeAsync(DateOnly date, CancellationToken cancellationToken) =>
        db.ExchangeRates.Where(r => r.Date <= date).MaxAsync(r => (DateOnly?)r.Date, cancellationToken);

    private async Task<RateTable> LoadAsync(DateOnly target, CancellationToken cancellationToken)
    {
        var rates = await db.ExchangeRates
            .AsNoTracking()
            .Where(r => r.Date == db.ExchangeRates.Where(x => x.Date <= target).Max(x => (DateOnly?)x.Date))
            .ToListAsync(cancellationToken);
        return rates.Count == 0
            ? RateTable.Empty
            : new RateTable(rates[0].Date, rates.ToDictionary(r => r.Currency, r => r.Rate));
    }

    private async Task<int> FetchAsync(DateOnly from, DateOnly to, bool force, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        if (!force && (!settings.Current.ExchangeRateSyncEnabled || !fetchLog.ShouldFetch(to, now)))
        {
            return 0;
        }

        fetchLog.Record(to, now);

        IReadOnlyList<ExchangeRate> fetched;
        try
        {
            fetched = await provider.GetAsync(from, to, cancellationToken);
        }
        catch (Exception ex) when (
            ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException
            && !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Exchange rates for {From}..{To} could not be fetched.", from, to);
            return 0;
        }

        if (fetched.Count == 0)
        {
            return 0;
        }

        var dates = fetched.Select(r => r.Date).ToArray();
        var codes = fetched.Select(r => r.Currency.ToCode()).ToArray();
        var values = fetched.Select(r => r.Rate).ToArray();
        var added = await db.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO "ExchangeRates" ("Date", "Currency", "Rate")
            SELECT * FROM unnest({dates}, {codes}, {values})
            ON CONFLICT DO NOTHING
            """,
            cancellationToken);
        if (added > 0)
        {
            tables.Clear();
        }

        return added;
    }
}
