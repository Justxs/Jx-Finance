using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Receipts;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Investments.Services;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateDiscordSettings;
using JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;
using JxFinance.Endpoints.Settings.UpdateSettings;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<ISettingsService>(LifeTime.Scoped)]
public sealed class SettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IExchangeRateService rates,
    IReportingRevaluation revaluation,
    IEmailDelivery emails,
    IAuthService authService,
    IDataProtectionProvider protection,
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

        var failed = await UpdateStoredAsync(
            async settings =>
            {
                if (settings.ReportingCurrency != request.ReportingCurrency
                    && await RevalueAsync(request.ReportingCurrency, cancellationToken) is { } error)
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

    public SmtpSettingsResponse GetSmtp() => ToResponse(store.Current.Smtp);

    public async Task<Result<SmtpSettingsResponse>> UpdateSmtpAsync(
        UpdateSmtpSettingsRequest request,
        CancellationToken cancellationToken) =>
        await UpdateStoredAsync(settings => Task.FromResult(ApplySmtp(request, settings)), cancellationToken) is { } error
            ? error
            : ToResponse(store.Current.Smtp);

    private DomainError? ApplySmtp(UpdateSmtpSettingsRequest request, InstanceSettings settings)
    {
        var userName = OptionalText.Normalize(request.UserName);
        var host = OptionalText.Normalize(request.Host);
        var password = OptionalText.Normalize(request.Password);
        if (userName is not null
            && password is null
            && settings.SmtpProtectedPassword.Length > 0
            && (!SameText(host, settings.SmtpHost, StringComparison.OrdinalIgnoreCase)
                || !SameText(userName, settings.SmtpUserName, StringComparison.Ordinal)))
        {
            return new DomainError(
                ErrorCodes.EmailPasswordRequired,
                "Enter the password again: the stored one is only kept for the same mail server and user name.");
        }

        settings.SmtpEnabled = request.Enabled;
        settings.SmtpHost = host;
        settings.SmtpPort = request.Port;
        settings.SmtpEncryption = request.Encryption;
        settings.SmtpUserName = userName;
        settings.SmtpFromAddress = OptionalText.Normalize(request.FromAddress);
        settings.SmtpFromName = OptionalText.Normalize(request.FromName);

        if (userName is null)
        {
            settings.SmtpProtectedPassword = string.Empty;
        }
        else if (password is not null)
        {
            settings.SmtpProtectedPassword = protection.Protect(EmailDelivery.ProtectorPurpose, password);
        }

        return null;
    }

    public async Task<Result<SmtpTestResponse>> SendTestEmailAsync(CancellationToken cancellationToken)
    {
        if (await authService.CurrentAsync(cancellationToken) is not { Email: { } address } administrator)
        {
            return EntityLookup.NotFound("User not found.");
        }

        var settings = store.Current;
        var sent = await emails.SendAsync(
            EmailTexts.Test(
                administrator.Language ?? settings.DefaultLanguage,
                address,
                administrator.DisplayName,
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);

        return sent.IsSuccess ? new SmtpTestResponse(address) : sent.Error;
    }

    public async Task<MarketPriceSettingsResponse> GetMarketPricesAsync(CancellationToken cancellationToken)
    {
        var settings = await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken)
            ?? store.Defaults();
        var failures = await db.Securities
            .AsNoTracking()
            .Where(s => s.PriceSource != PriceSource.None && s.PriceSyncError != null && s.PriceSyncedAt != null)
            .OrderBy(s => s.Symbol)
            .Select(s => new { s.Id, s.Symbol, s.Name, s.PriceSyncError, s.PriceSyncedAt })
            .ToListAsync(cancellationToken);
        return new MarketPriceSettingsResponse(
            settings.PriceSyncEnabled,
            settings.EodhdProtectedKey.Length > 0,
            settings.PriceSyncRunAt,
            PriceSyncRules.CallsLeft(settings, clock.Today, options.Value.MarketPrices.EodhdDailyLimit),
            [.. failures.Select(f => new PriceSyncFailure(f.Id.Value, f.Symbol, f.Name, f.PriceSyncError!, f.PriceSyncedAt!.Value))]);
    }

    public async Task<MarketPriceSettingsResponse> UpdateMarketPricesAsync(
        UpdateMarketPriceSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await UpdateStoredAsync(
            settings =>
            {
                settings.PriceSyncEnabled = request.Enabled;
                if (request.EodhdApiKey is { } key)
                {
                    settings.EodhdProtectedKey = key.Trim().Length == 0
                        ? string.Empty
                        : protection.Protect(PriceSyncService.KeyPurpose, key.Trim());
                }

                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);
        return await GetMarketPricesAsync(cancellationToken);
    }

    public Task UpdateDiscordAsync(UpdateDiscordSettingsRequest request, CancellationToken cancellationToken) =>
        UpdateStoredAsync(
            settings =>
            {
                settings.DiscordEnabled = request.Enabled;
                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);

    private async Task<DomainError?> UpdateStoredAsync(
        Func<InstanceSettings, Task<DomainError?>> change,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var settings = await LoadOrCreateAsync(cancellationToken);
        if (await change(settings) is { } error)
        {
            return error;
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        store.Set(settings);
        return null;
    }

    public async Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken)
    {
        var added = await rates.SyncAsync(force: true, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);
        return new ExchangeRateSyncResponse(added, latest.AsOf);
    }

    private async Task<string?> RevalueAsync(Currency reportingCurrency, CancellationToken cancellationToken)
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

        return null;
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

    private async Task<InstanceSettings> LoadOrCreateAsync(CancellationToken cancellationToken)
    {
        if (await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken) is { } stored)
        {
            return stored;
        }

        var created = store.Defaults();
        db.InstanceSettings.Add(created);
        return created;
    }

    private static bool SameText(string? requested, string? stored, StringComparison comparison) =>
        string.Equals(requested, OptionalText.Normalize(stored), comparison);

    private static SmtpSettingsResponse ToResponse(SmtpSettingsSnapshot smtp) => new(
        smtp.Enabled,
        smtp.Host,
        smtp.Port,
        smtp.Encryption,
        smtp.UserName,
        smtp.HasPassword,
        smtp.FromAddress,
        smtp.FromName);
}
