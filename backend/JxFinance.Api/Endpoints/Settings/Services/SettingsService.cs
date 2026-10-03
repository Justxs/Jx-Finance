using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Receipts;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSettings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<ISettingsService>(LifeTime.Scoped)]
public sealed class SettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IExchangeRateService rates,
    IReportingRevaluation revaluation,
    IReceiptReader receipts,
    IClock clock,
    IOptions<AppOptions> options) : ISettingsService
{
    public async Task<SettingsResponse> GetAsync(CancellationToken cancellationToken)
    {
        var latest = await rates.GetLatestAsync(cancellationToken);
        return ToResponse(store.Current, latest.AsOf);
    }

    public PublicSettingsResponse GetPublic() =>
        new(
            store.Current.InstanceName,
            store.Current.DefaultLanguage,
            store.Current.Smtp.IsConfigured,
            store.Current.DiscordEnabled,
            PasskeySite.IsAvailable(options.Value.SiteUrl));

    public async Task<Result<SettingsResponse>> UpdateAsync(
        UpdateSettingsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.DefaultAccountId is { } accountId && accountId != store.Current.DefaultAccountId)
        {
            var typedAccountId = new AccountId(accountId);
            var exists = await db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AnyAsync(a => a.Id == typedAccountId, cancellationToken);
            if (!exists)
            {
                return new DomainError(ErrorCodes.ReferenceNotFound, "The default account does not exist.");
            }
        }

        var failed = await StoredSettings.UpdateAsync(
            db,
            store,
            async settings =>
            {
                if (settings.ReportingCurrency != request.ReportingCurrency
                    && await RevalueAsync(settings.ReportingCurrency, request.ReportingCurrency, cancellationToken) is { } error)
                {
                    return new DomainError(ErrorCodes.ExchangeRateUnavailable, error);
                }

                var currencies = request.EnabledCurrencies
                    .Append(request.ReportingCurrency)
                    .Distinct()
                    .OrderBy(c => c.ToCode(), StringComparer.Ordinal);

                settings.InstanceName = OptionalText.Normalize(request.InstanceName);
                settings.Features = request.Features;
                settings.ReportingCurrency = request.ReportingCurrency;
                settings.EnabledCurrencyCodes = string.Join(',', currencies.Select(c => c.ToCode()));
                settings.ExchangeRateSyncEnabled = request.ExchangeRateSyncEnabled;
                settings.DefaultLanguage = request.DefaultLanguage;
                settings.TimeZone = request.TimeZone;
                settings.FirstDayOfWeek = request.FirstDayOfWeek;
                settings.DefaultAccountId = request.DefaultAccountId;
                settings.DefaultPageSize = request.DefaultPageSize;
                settings.SupportLinkEnabled = request.SupportLinkEnabled;
                return null;
            },
            cancellationToken);

        if (failed is not null)
        {
            return failed;
        }

        return await GetAsync(cancellationToken);
    }

    private async Task<string?> RevalueAsync(Currency previousCurrency, Currency reportingCurrency, CancellationToken cancellationToken)
    {
        await revaluation.LockAsync(cancellationToken);

        var foreign = db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency != reportingCurrency);
        var foreignEntries = db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => t.CashAmount.Currency != reportingCurrency);
        var foreignSnapshots = db.NetWorthSnapshots
            .IgnoreQueryFilters()
            .Where(s => s.Currency != reportingCurrency);

        var dates = new[]
        {
            await foreign.MinAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreign.MaxAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreignEntries.MinAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreignEntries.MaxAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreignSnapshots.MinAsync(s => (DateOnly?)s.Date, cancellationToken),
            await foreignSnapshots.MaxAsync(s => (DateOnly?)s.Date, cancellationToken),
        }.OfType<DateOnly>().ToList();
        if (dates.Count > 0)
        {
            await rates.EnsureRangeAsync(dates.Min(), dates.Max(), cancellationToken);
            await rates.PreloadAsync(dates.Min(), dates.Max(), cancellationToken);
        }

        if (await revaluation.RevalueAsync(foreign, foreignEntries, reportingCurrency, cancellationToken) is { } error)
        {
            return error;
        }

        var now = clock.UtcNow;
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency == reportingCurrency && t.ReportingAmount != t.Amount.Amount)
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.ReportingAmount, t => t.Amount.Amount).SetProperty(t => t.UpdatedAt, now),
                cancellationToken);
        await db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => t.CashAmount.Currency == reportingCurrency && t.ReportingAmount != t.CashAmount.Amount)
            .ExecuteUpdateAsync(
                s => s.SetProperty(t => t.ReportingAmount, t => t.CashAmount.Amount).SetProperty(t => t.UpdatedAt, now),
                cancellationToken);
        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.UnusualCheckedAt != null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UnusualCheckedAt, (DateTimeOffset?)null), cancellationToken);

        return await revaluation.ConvertPlansAsync(previousCurrency, reportingCurrency, cancellationToken);
    }

    private SettingsResponse ToResponse(InstanceSettingsSnapshot settings, DateOnly? ratesAsOf) => new(
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
        settings.DefaultPageSize,
        settings.SupportLinkEnabled,
        settings.Features.ReceiptReading && receipts.IsAvailable);

}
