using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSettings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<ISettingsService>(LifeTime.Scoped)]
public sealed class SettingsService(AppDbContext db, IInstanceSettingsStore store, IExchangeRateService rates)
    : ISettingsService
{
    public async Task<SettingsResponse> GetAsync(CancellationToken cancellationToken)
    {
        var latest = await rates.GetLatestAsync(cancellationToken);
        return ToResponse(store.Current, latest.AsOf);
    }

    public PublicSettingsResponse GetPublic() =>
        new(store.Current.InstanceName, store.Current.DefaultLanguage);

    public async Task<Result<SettingsResponse>> UpdateAsync(
        UpdateSettingsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.DefaultAccountId is { } accountId && accountId != store.Current.DefaultAccountId)
        {
            var typedAccountId = new AccountId(accountId);
            var exists = await db.Accounts.IgnoreQueryFilters()
                .AnyAsync(a => a.Id == typedAccountId && !a.IsDeleted, cancellationToken);
            if (!exists)
            {
                return Result<SettingsResponse>.Failure(ErrorCodes.ReferenceNotFound, "The default account does not exist.");
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var settings = await db.InstanceSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = store.Defaults();
            db.InstanceSettings.Add(settings);
        }

        if (settings.ReportingCurrency != request.ReportingCurrency)
        {
            var error = await RevalueAsync(request.ReportingCurrency, cancellationToken);
            if (error is not null)
            {
                return Result<SettingsResponse>.Failure(ErrorCodes.ExchangeRateUnavailable, error);
            }
        }

        var currencies = request.EnabledCurrencies
            .Append(request.ReportingCurrency)
            .Distinct()
            .OrderBy(c => c.ToCode(), StringComparer.Ordinal);

        settings.InstanceName = string.IsNullOrWhiteSpace(request.InstanceName) ? null : request.InstanceName.Trim();
        settings.Features = request.Features;
        settings.ReportingCurrency = request.ReportingCurrency;
        settings.EnabledCurrencyCodes = string.Join(',', currencies.Select(c => c.ToCode()));
        settings.ExchangeRateSyncEnabled = request.ExchangeRateSyncEnabled;
        settings.DefaultLanguage = request.DefaultLanguage;
        settings.TimeZone = request.TimeZone;
        settings.FirstDayOfWeek = request.FirstDayOfWeek;
        settings.DefaultAccountId = request.DefaultAccountId;
        settings.DefaultPageSize = request.DefaultPageSize;

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        store.Set(settings);

        return Result<SettingsResponse>.Success(await GetAsync(cancellationToken));
    }

    public async Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken)
    {
        var added = await rates.SyncAsync(force: true, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);
        return new ExchangeRateSyncResponse(added, latest.AsOf);
    }

    private async Task<string?> RevalueAsync(Currency reportingCurrency, CancellationToken cancellationToken)
    {
        var foreign = await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency != reportingCurrency)
            .ToListAsync(cancellationToken);
        var entries = await db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => !t.IsDeleted)
            .ToListAsync(cancellationToken);
        var dates = foreign.Select(t => t.Date)
            .Concat(entries.Where(e => e.CashAmount.Currency != reportingCurrency).Select(e => e.Date))
            .ToList();
        if (dates.Count > 0)
        {
            await rates.EnsureRangeAsync(dates.Min(), dates.Max(), cancellationToken);
        }

        foreach (var transaction in foreign)
        {
            var value = await rates.ConvertAsync(transaction.Amount, reportingCurrency, transaction.Date, cancellationToken);
            if (value.IsFailure)
            {
                return value.ErrorMessage;
            }

            transaction.ReportingAmount = value.Value;
        }

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency == reportingCurrency)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReportingAmount, t => t.Amount.Amount), cancellationToken);

        foreach (var entry in entries)
        {
            var value = await rates.ConvertAsync(entry.CashAmount, reportingCurrency, entry.Date, cancellationToken);
            if (value.IsFailure)
            {
                return value.ErrorMessage;
            }

            entry.ReportingAmount = value.Value;
        }

        return null;
    }

    private static SettingsResponse ToResponse(InstanceSettingsSnapshot settings, DateOnly? ratesAsOf) => new(
        settings.InstanceName,
        settings.Features,
        settings.ReportingCurrency,
        settings.EnabledCurrencies,
        settings.ExchangeRateSyncEnabled,
        ratesAsOf,
        settings.DefaultLanguage,
        settings.TimeZoneId,
        settings.FirstDayOfWeek,
        settings.DefaultAccountId,
        settings.DefaultPageSize);
}
