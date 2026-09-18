using FastEndpoints;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.Settings;

[RegisterService<IInstanceSettingsStore>(LifeTime.Singleton)]
public sealed class InstanceSettingsStore(
    IServiceScopeFactory scopes,
    IOptions<AppOptions> options,
    ILogger<InstanceSettingsStore> logger) : IInstanceSettingsStore
{
    private InstanceSettingsSnapshot? current;

    public InstanceSettingsSnapshot Current => Volatile.Read(ref current) ?? Load();

    public InstanceSettings Defaults() => new()
    {
        ReportingCurrency = options.Value.ReportingCurrency,
        ExchangeRateSyncEnabled = options.Value.ExchangeRates.Enabled,
        DefaultLanguage = options.Value.DefaultCulture.StartsWith("lt", StringComparison.OrdinalIgnoreCase) ? "lt" : "en",
        TimeZone = options.Value.TimeZone,
    };

    public void Set(InstanceSettings settings) =>
        Volatile.Write(ref current, InstanceSettingsSnapshot.From(settings));

    private InstanceSettingsSnapshot Load()
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stored = db.InstanceSettings.AsNoTracking().FirstOrDefault();
            var snapshot = InstanceSettingsSnapshot.From(stored ?? Defaults());
            return Interlocked.CompareExchange(ref current, snapshot, null) ?? snapshot;
        }
        catch (Exception ex) when (ex is InvalidOperationException or Npgsql.NpgsqlException or System.Net.Sockets.SocketException)
        {
            logger.LogWarning(ex, "Instance settings could not be loaded; using defaults for this request.");
            return InstanceSettingsSnapshot.From(Defaults());
        }
    }
}
