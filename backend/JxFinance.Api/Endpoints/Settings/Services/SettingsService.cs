using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
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
            var exists = await db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .AnyAsync(a => a.Id == typedAccountId, cancellationToken);
            if (!exists)
            {
                return new DomainError(ErrorCodes.ReferenceNotFound, "The default account does not exist.");
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var settings = await LoadOrCreateAsync(cancellationToken);

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

        var settings = await LoadOrCreateAsync(cancellationToken);

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
        if (await authService.CurrentAsync(cancellationToken) is not { Email: { } address } administrator)
        {
            return EntityLookup.NotFound("User not found.");
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

        var error = await RevalueInBatchesAsync<Transaction, TransactionId>(
            (after, size) => (after is { } last ? foreign.Where(t => t.Id > last) : foreign).OrderBy(t => t.Id).Take(size),
            t => t.Id,
            t => (t.Amount, t.Date),
            (t, value) => t.ReportingAmount = value,
            reportingCurrency,
            cancellationToken);
        error ??= await RevalueInBatchesAsync<InvestmentTransaction, InvestmentTransactionId>(
            (after, size) => (after is { } last ? foreignEntries.Where(t => t.Id > last) : foreignEntries).OrderBy(t => t.Id).Take(size),
            t => t.Id,
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
            .Where(t => t.CashAmount.Currency == reportingCurrency)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReportingAmount, t => t.CashAmount.Amount), cancellationToken);

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
        var batchSize = Math.Max(options.Value.RevalueBatchSize, 1);
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

    private async Task<InstanceSettings> LoadOrCreateAsync(CancellationToken cancellationToken)
    {
        if (await db.InstanceSettings.FirstOrDefaultAsync(cancellationToken) is { } stored)
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
