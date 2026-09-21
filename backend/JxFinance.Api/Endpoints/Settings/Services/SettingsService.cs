using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSettings;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;
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
    IEmailDelivery emails,
    IAuthService authService,
    ICurrentUser currentUser,
    IDataProtectionProvider protection,
    IOptions<AppOptions> options) : ISettingsService
{
    private const string LockRevaluedTables =
        "LOCK TABLE \"Transactions\", \"InvestmentTransactions\" IN SHARE ROW EXCLUSIVE MODE";

    public async Task<SettingsResponse> GetAsync(CancellationToken cancellationToken)
    {
        var latest = await rates.GetLatestAsync(cancellationToken);
        return ToResponse(store.Current, latest.AsOf);
    }

    public PublicSettingsResponse GetPublic() =>
        new(store.Current.InstanceName, store.Current.DefaultLanguage, store.Current.Smtp.IsConfigured);

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
                return new DomainError(ErrorCodes.ReferenceNotFound, "The default account does not exist.");
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
                return new DomainError(ErrorCodes.ExchangeRateUnavailable, error);
            }
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

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        store.Set(settings);

        return await GetAsync(cancellationToken);
    }

    public SmtpSettingsResponse GetSmtp() => ToResponse(store.Current.Smtp);

    public async Task<Result<SmtpSettingsResponse>> UpdateSmtpAsync(
        UpdateSmtpSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var settings = await db.InstanceSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = store.Defaults();
            db.InstanceSettings.Add(settings);
        }

        var userName = OptionalText.Normalize(request.UserName);
        settings.SmtpEnabled = request.Enabled;
        settings.SmtpHost = OptionalText.Normalize(request.Host);
        settings.SmtpPort = request.Port;
        settings.SmtpEncryption = request.Encryption;
        settings.SmtpUserName = userName;
        settings.SmtpFromAddress = OptionalText.Normalize(request.FromAddress);
        settings.SmtpFromName = OptionalText.Normalize(request.FromName);

        if (userName is null)
        {
            settings.SmtpProtectedPassword = string.Empty;
        }
        else if (OptionalText.Normalize(request.Password) is { } password)
        {
            settings.SmtpProtectedPassword = protection
                .CreateProtector(EmailDelivery.ProtectorPurpose)
                .Protect(password);
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        store.Set(settings);

        return ToResponse(store.Current.Smtp);
    }

    public async Task<Result<SmtpTestResponse>> SendTestEmailAsync(CancellationToken cancellationToken)
    {
        if (await authService.FindByIdAsync(currentUser.Id, cancellationToken) is not { Email: { } address } administrator)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "User not found.");
        }

        var settings = store.Current;
        var sent = await emails.SendAsync(
            EmailTexts.Test(
                settings.DefaultLanguage,
                address,
                administrator.DisplayName,
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);

        return sent.IsSuccess ? new SmtpTestResponse(address) : sent.Error;
    }

    public async Task<ExchangeRateSyncResponse> SyncExchangeRatesAsync(CancellationToken cancellationToken)
    {
        var added = await rates.SyncAsync(force: true, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);
        return new ExchangeRateSyncResponse(added, latest.AsOf);
    }

    private async Task<string?> RevalueAsync(Currency reportingCurrency, CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlRawAsync(LockRevaluedTables, cancellationToken);

        var foreign = db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency != reportingCurrency);
        var foreignEntries = db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => !t.IsDeleted && t.CashAmount.Currency != reportingCurrency);

        var dates = new[]
        {
            await foreign.MinAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreign.MaxAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreignEntries.MinAsync(t => (DateOnly?)t.Date, cancellationToken),
            await foreignEntries.MaxAsync(t => (DateOnly?)t.Date, cancellationToken),
        }.OfType<DateOnly>().ToList();
        if (dates.Count > 0)
        {
            await rates.EnsureRangeAsync(dates.Min(), dates.Max(), cancellationToken);
        }

        var error = await RevalueInBatchesAsync(
            foreign.OrderBy(t => t.Id),
            t => (t.Amount, t.Date),
            (t, value) => t.ReportingAmount = value,
            reportingCurrency,
            cancellationToken);
        error ??= await RevalueInBatchesAsync(
            foreignEntries.OrderBy(t => t.Id),
            t => (t.CashAmount, t.Date),
            (t, value) => t.ReportingAmount = value,
            reportingCurrency,
            cancellationToken);
        if (error is not null)
        {
            return error;
        }

        await db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Amount.Currency == reportingCurrency)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReportingAmount, t => t.Amount.Amount), cancellationToken);
        await db.InvestmentTransactions
            .IgnoreQueryFilters()
            .Where(t => !t.IsDeleted && t.CashAmount.Currency == reportingCurrency)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReportingAmount, t => t.CashAmount.Amount), cancellationToken);

        return null;
    }

    private async Task<string?> RevalueInBatchesAsync<T>(
        IOrderedQueryable<T> rows,
        Func<T, (Money Amount, DateOnly Date)> read,
        Action<T, decimal> write,
        Currency reportingCurrency,
        CancellationToken cancellationToken)
        where T : class
    {
        var batchSize = Math.Max(options.Value.RevalueBatchSize, 1);
        for (var skip = 0; ; skip += batchSize)
        {
            var batch = await rows.Skip(skip).Take(batchSize).ToListAsync(cancellationToken);
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

            await db.SaveChangesAsync(cancellationToken);
            foreach (var row in batch)
            {
                db.Entry(row).State = EntityState.Detached;
            }
        }
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
