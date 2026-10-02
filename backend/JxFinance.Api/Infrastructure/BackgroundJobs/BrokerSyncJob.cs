using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class BrokerSyncJob(IServiceScopeFactory scopes, ILogger<BrokerSyncJob> logger) : PeriodicJob(scopes, logger)
{
    protected override string Name => "Broker sync";

    protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromHours(24));

    protected override Feature? RequiredFeature => Feature.Investments;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var source = services.GetRequiredService<AppDbContext>();
        var activeUsers = source.Users.Where(AppUser.IsActive);
        var connections = await source.BrokerConnections
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(c => c.IsEnabled
                && source.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly).Any(a => a.Id == c.AccountId)
                && activeUsers.Any(u => u.Id == c.UserId))
            .Select(c => new { c.UserId, c.AccountId })
            .ToListAsync(ct);

        foreach (var connection in connections)
        {
            await RunAsUserAsync(connection.UserId, async scoped =>
            {
                var result = await scoped.GetRequiredService<IBrokerImportService>().SyncAsync(connection.AccountId.Value, ct);
                if (result.IsFailure)
                {
                    Logger.LogWarning("Broker sync for account {AccountId} failed: {Error}", connection.AccountId, result.ErrorMessage);
                }
            });
        }
    }
}
