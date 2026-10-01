using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Endpoints.Settings.DeleteExchangeRate;
using JxFinance.Endpoints.Settings.GetExchangeRateEntries;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.SetExchangeRate;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<IExchangeRateEntryService>(LifeTime.Scoped)]
public sealed class ExchangeRateEntryService(
    AppDbContext db,
    IExchangeRateService rates,
    IReportingRevaluation revaluation,
    IClock clock) : IExchangeRateEntryService
{
    private const int RecentDays = 30;

    public async Task<IReadOnlyList<ExchangeRateEntryResponse>> GetAsync(
        GetExchangeRateEntriesRequest request,
        CancellationToken cancellationToken)
    {
        var manual = await db.ManualExchangeRates
            .AsNoTracking()
            .Where(r => r.Currency == request.Currency)
            .ToListAsync(cancellationToken);
        var manualDates = manual.Select(r => r.Date).ToList();
        var since = clock.Today.AddDays(-RecentDays);
        var synced = await db.ExchangeRates
            .AsNoTracking()
            .Where(r => r.Currency == request.Currency && (r.Date >= since || manualDates.Contains(r.Date)))
            .ToDictionaryAsync(r => r.Date, r => r.Rate, cancellationToken);

        return
        [
            .. manual
                .Select(r => Entry(r, synced.TryGetValue(r.Date, out var rate) ? rate : null))
                .Concat(synced
                    .Where(r => r.Key >= since && !manualDates.Contains(r.Key))
                    .Select(r => new ExchangeRateEntryResponse(r.Key, request.Currency, r.Value, ExchangeRateSource.Ecb, null)))
                .OrderByDescending(r => r.Date),
        ];
    }

    public async Task<Result<ExchangeRateEntryResponse>> SetAsync(
        SetExchangeRateRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await revaluation.LockAsync(cancellationToken);
        var stored = await FindAsync(request.Currency, request.Date, cancellationToken);
        if (stored is null)
        {
            stored = new ManualExchangeRate { Currency = request.Currency, Date = request.Date };
            db.ManualExchangeRates.Add(stored);
        }

        stored.Rate = request.Rate!.Value;
        await db.SaveChangesAsync(cancellationToken);
        if (await RevalueFromAsync(request.Currency, request.Date, cancellationToken) is { } error)
        {
            return error;
        }

        await transaction.CommitAsync(cancellationToken);
        var synced = await db.ExchangeRates
            .Where(r => r.Currency == request.Currency && r.Date == request.Date)
            .Select(r => (decimal?)r.Rate)
            .FirstOrDefaultAsync(cancellationToken);
        return Entry(stored, synced);
    }

    public async Task<Result> DeleteAsync(DeleteExchangeRateRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await revaluation.LockAsync(cancellationToken);
        if (await FindAsync(request.Currency, request.Date, cancellationToken) is not { } stored)
        {
            return EntityLookup.NotFound("No rate was entered by hand for that currency and date.");
        }

        db.ManualExchangeRates.Remove(stored);
        await db.SaveChangesAsync(cancellationToken);
        if (await RevalueFromAsync(request.Currency, request.Date, cancellationToken) is { } error)
        {
            return error;
        }

        await transaction.CommitAsync(cancellationToken);
        return Result.Success();
    }

    private Task<ManualExchangeRate?> FindAsync(Currency currency, DateOnly date, CancellationToken cancellationToken) =>
        db.ManualExchangeRates.FirstOrDefaultAsync(r => r.Currency == currency && r.Date == date, cancellationToken);

    private async Task<DomainError?> RevalueFromAsync(Currency currency, DateOnly from, CancellationToken cancellationToken)
    {
        var nextSynced = await db.ExchangeRates
            .Where(r => r.Currency == currency && r.Date > from)
            .MinAsync(r => (DateOnly?)r.Date, cancellationToken);
        var nextManual = await db.ManualExchangeRates
            .Where(r => r.Currency == currency && r.Date > from)
            .MinAsync(r => (DateOnly?)r.Date, cancellationToken);
        var next = new[] { nextSynced, nextManual }.Min();
        var to = next is { } day && day.AddDays(-1) < clock.Today ? day.AddDays(-1) : clock.Today;

        var reporting = rates.ReportingCurrency;
        var transactions = db.Transactions.IgnoreQueryFilters().Where(t => t.Date >= from && t.Date <= to);
        var entries = db.InvestmentTransactions.IgnoreQueryFilters().Where(t => t.Date >= from && t.Date <= to);
        if (currency == reporting)
        {
            transactions = transactions.Where(t => t.Amount.Currency != reporting);
            entries = entries.Where(t => t.CashAmount.Currency != reporting);
        }
        else
        {
            transactions = transactions.Where(t => t.Amount.Currency == currency);
            entries = entries.Where(t => t.CashAmount.Currency == currency);
        }

        await rates.PreloadAsync(from, to, cancellationToken);
        return await revaluation.RevalueAsync(transactions, entries, reporting, cancellationToken) is { } error
            ? new DomainError(ErrorCodes.ExchangeRateUnavailable, error)
            : null;
    }

    private static ExchangeRateEntryResponse Entry(ManualExchangeRate rate, decimal? synced) =>
        new(rate.Date, rate.Currency, rate.Rate, ExchangeRateSource.Manual, synced);
}
