using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.MarketPrices;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<IMarketPriceSettingsService>(LifeTime.Scoped)]
public sealed class MarketPriceSettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IDataProtectionProvider protection,
    IClock clock,
    IOptions<AppOptions> options) : IMarketPriceSettingsService
{
    public async Task<MarketPriceSettingsResponse> GetMarketPricesAsync(CancellationToken cancellationToken)
    {
        var settings = await StoredSettings.ReadAsync(db, store, cancellationToken);
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

    public async Task<Result<MarketPriceSettingsResponse>> UpdateMarketPricesAsync(
        UpdateMarketPriceSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var failed = await StoredSettings.UpdateAsync(
            db,
            store,
            settings =>
            {
                settings.PriceSyncEnabled = request.Enabled;
                if (request.EodhdApiKey is { } key)
                {
                    settings.EodhdProtectedKey = key.Trim().Length == 0
                        ? string.Empty
                        : protection.Protect(PriceSyncRules.KeyPurpose, key.Trim());
                }

                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);
        return failed is null ? await GetMarketPricesAsync(cancellationToken) : failed;
    }
}
