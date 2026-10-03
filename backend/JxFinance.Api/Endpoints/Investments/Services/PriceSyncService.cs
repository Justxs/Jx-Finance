using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Holdings;
using JxFinance.Common.MarketPrices;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.MarketPrices;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IPriceSyncService>(LifeTime.Scoped)]
public sealed class PriceSyncService(
    AppDbContext db,
    IEnumerable<IMarketPriceProvider> providers,
    IInstanceSettingsStore store,
    IDataProtectionProvider protection,
    IClock clock,
    IOptions<AppOptions> options,
    ILogger<PriceSyncService> logger) : IPriceSyncService
{
    private static readonly DomainError KeyUnreadable = new(
        ErrorCodes.MarketPricesKeyUnreadable,
        "The saved EODHD key can no longer be read on this installation. Enter it again.");

    private int DailyLimit => options.Value.MarketPrices.EodhdDailyLimit;

    public async Task<Result<MarketPriceSyncResponse>> SyncAsync(bool force, CancellationToken cancellationToken)
    {
        var claimed = await ClaimAsync(force, cancellationToken);
        if (!claimed.TryGetValue(out var claim))
        {
            return claimed.Error;
        }

        var fetched = new List<(PriceFetch Fetch, Result<IReadOnlyList<MarketClose>> Closes)>();
        foreach (var fetch in claim.Fetches)
        {
            var security = fetch.Security;
            fetched.Add((fetch, await Provider(security.PriceSource).CloseAsync(security, fetch.From, claim.To, claim.Key, cancellationToken)));
        }

        return await RecordAsync(fetched, claim.To, cancellationToken);
    }

    public async Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindSymbolAsync(
        Guid securityId,
        CancellationToken cancellationToken)
    {
        var id = new SecurityId(securityId);
        var security = await db.Securities.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (security is null)
        {
            return EntityLookup.NotFound("Security not found.");
        }

        if (security.Isin is not { } isin)
        {
            return new DomainError(ErrorCodes.Required, "Save the ISIN of this security first; Find looks it up by ISIN.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.PriceSync, cancellationToken);
        var settings = await SettingsRowAsync(cancellationToken);
        var key = ReadKey(settings);
        if (key.IsFailure)
        {
            return key.Error;
        }

        var today = clock.Today;
        if (PriceSyncRules.CallsLeft(settings, today, DailyLimit) < 1)
        {
            return new DomainError(
                ErrorCodes.MarketPricesRejected,
                $"The {DailyLimit} EODHD calls of today are used up. Try again tomorrow.");
        }

        PriceSyncRules.Spend(settings, today, 1);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await Provider(PriceSource.Eodhd).FindAsync(isin, key.Value, cancellationToken);
    }

    private async Task<Result<PriceClaim>> ClaimAsync(bool force, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.PriceSync, cancellationToken);
        var settings = await SettingsRowAsync(cancellationToken);
        var key = ReadKey(settings);

        var firstTrades = await HeldSecurities.FirstTradesAsync(db, cancellationToken);
        var heldIds = firstTrades.Keys.ToList();
        var mapped = await db.Securities
            .Where(s => s.PriceSource != PriceSource.None && heldIds.Contains(s.Id))
            .ToListAsync(cancellationToken);
        if (force && key.IsFailure && mapped.Any(s => s.PriceSource == PriceSource.Eodhd))
        {
            return key.Error;
        }

        var mappedIds = mapped.Select(s => s.Id).ToList();
        var withFeed = (await db.SecurityPrices
                .Where(p => mappedIds.Contains(p.SecurityId) && p.Source == PriceSourceKind.Feed)
                .Select(p => p.SecurityId)
                .Distinct()
                .ToListAsync(cancellationToken))
            .ToHashSet();
        var due = mapped
            .Where(s => PriceSyncRules.IsDue(s, clock, force))
            .OrderBy(s => s.LastPriceDate ?? DateOnly.MinValue)
            .ThenBy(s => s.Symbol, StringComparer.Ordinal)
            .ToList();

        var today = clock.Today;
        var to = today.AddDays(-1);
        var fetches = new List<PriceFetch>();
        foreach (var security in due)
        {
            var from = PriceSyncRules.From(security, withFeed.Contains(security.Id), firstTrades[security.Id]);
            if (from > to)
            {
                MarkSynced(security, null);
                continue;
            }

            var calls = Provider(security.PriceSource).CallsFor(security);
            if (security.PriceSource == PriceSource.Eodhd
                && (key.IsFailure || calls > PriceSyncRules.CallsLeft(settings, today, DailyLimit)))
            {
                continue;
            }

            PriceSyncRules.Spend(settings, today, calls);
            MarkSynced(security, null);
            fetches.Add(new PriceFetch(security, security.PriceSource, security.PriceSymbol!, from));
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        db.ChangeTracker.Clear();
        return new PriceClaim(fetches, to, key.Value);
    }

    private async Task<Result<MarketPriceSyncResponse>> RecordAsync(
        List<(PriceFetch Fetch, Result<IReadOnlyList<MarketClose>> Closes)> fetched,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.PriceSync, cancellationToken);
        var settings = await SettingsRowAsync(cancellationToken);
        var ids = fetched.Select(f => f.Fetch.Security.Id).ToList();
        var securities = await db.Securities.Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, cancellationToken);
        var (written, failed) = (0, 0);
        foreach (var (fetch, fetchedCloses) in fetched)
        {
            if (!securities.TryGetValue(fetch.Security.Id, out var security)
                || security.PriceSource != fetch.Source
                || security.PriceSymbol != fetch.Symbol)
            {
                continue;
            }

            security.PriceQuoteCurrency ??= fetch.Security.PriceQuoteCurrency;
            var closes = fetchedCloses.IsSuccess ? PriceSyncRules.InSecurityCurrency(security, fetchedCloses.Value!) : fetchedCloses;
            if (closes.IsFailure)
            {
                failed++;
                MarkSynced(security, closes.ErrorMessage);
                logger.LogWarning("Price sync for {Symbol} failed: {Error}", fetch.Symbol, closes.ErrorMessage);
            }
            else
            {
                written += await WriteAsync(security, closes.Value!, fetch.From, to, cancellationToken);
                MarkSynced(security, null);
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        settings.PriceSyncRunAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new MarketPriceSyncResponse(fetched.Count, written, failed, PriceSyncRules.CallsLeft(settings, clock.Today, DailyLimit));
    }

    private IMarketPriceProvider Provider(PriceSource source) => providers.First(p => p.Source == source);

    private Result<string> ReadKey(InstanceSettings settings)
    {
        if (settings.EodhdProtectedKey.Length == 0)
        {
            return MarketPriceErrors.KeyRequired;
        }

        if (protection.TryUnprotect(PriceSyncRules.KeyPurpose, settings.EodhdProtectedKey) is not { } key)
        {
            return KeyUnreadable;
        }

        return key;
    }

    private async Task<InstanceSettings> SettingsRowAsync(CancellationToken cancellationToken)
    {
        if (await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken) is { } stored)
        {
            return stored;
        }

        var created = store.Defaults();
        db.InstanceSettings.Add(created);
        return created;
    }

    private async Task<int> WriteAsync(
        Security security,
        IReadOnlyList<MarketClose> closes,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var existing = await db.SecurityPrices
            .Where(p => p.SecurityId == security.Id && p.Date >= from && p.Date <= to)
            .ToDictionaryAsync(p => p.Date, cancellationToken);
        var written = 0;
        foreach (var close in closes.Where(c => c.Date >= from && c.Date <= to))
        {
            if (SecurityPriceBook.Record(db, security, close.Date, decimal.Round(close.Close, 8), PriceSourceKind.Feed, existing.GetValueOrDefault(close.Date)))
            {
                written++;
            }
        }

        return written;
    }

    private void MarkSynced(Security security, string? error)
    {
        security.PriceSyncedAt = clock.UtcNow;
        security.PriceSyncError = error is { Length: > Security.PriceSyncErrorMaxLength } ? error[..Security.PriceSyncErrorMaxLength] : error;
    }

    private sealed record PriceFetch(Security Security, PriceSource Source, string Symbol, DateOnly From);

    private sealed record PriceClaim(IReadOnlyList<PriceFetch> Fetches, DateOnly To, string? Key);
}
