using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Services;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class BrokerSyncJob(IServiceScopeFactory scopes, ILogger<BrokerSyncJob> logger) : PeriodicJob(scopes, logger)
{
    protected override string Name => "Broker sync";

    protected override TimeSpan Interval => TimeSpan.FromHours(24);

    protected override Feature? RequiredFeature => Feature.Investments;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var source = services.GetRequiredService<AppDbContext>();
        var activeUsers = source.Users.Where(AppUser.IsActive);
        var connections = await source.BrokerConnections
            .IgnoreQueryFilters()
            .Where(c => !c.IsDeleted && c.IsEnabled
                && source.Accounts.IgnoreQueryFilters().Any(a => a.Id == c.AccountId && !a.IsDeleted)
                && activeUsers.Any(u => u.Id == c.UserId))
            .Select(c => new { c.UserId, c.AccountId })
            .ToListAsync(ct);
        var options = services.GetRequiredService<DbContextOptions<AppDbContext>>();
        var clock = services.GetRequiredService<IClock>();

        foreach (var connection in connections)
        {
            try
            {
                var user = new SyncUser(connection.UserId);
                await using var db = new AppDbContext(options, user, clock);
                var importer = ActivatorUtilities.CreateInstance<BrokerImportService>(services, db, user);
                var result = await importer.SyncAsync(connection.AccountId.Value, ct);
                if (result.IsFailure)
                {
                    Logger.LogWarning("Broker sync for account {AccountId} failed: {Error}", connection.AccountId, result.ErrorMessage);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Logger.LogError(ex, "Broker sync for account {AccountId} failed.", connection.AccountId);
            }
        }
    }

    private sealed record SyncUser(Guid Id) : ICurrentUser;
}
