using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Imports.Inbox;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Infrastructure.Imports;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class ImportInboxJob(
    IServiceScopeFactory scopeFactory,
    ImportInboxFolder folder,
    ILogger<ImportInboxJob> logger) : PeriodicJob(scopeFactory, logger)
{
    protected override string Name => "Import inbox";

    protected override TimeSpan Interval => TimeSpan.FromMinutes(5);

    protected override Feature? RequiredFeature => Feature.Import;

    protected override async Task RunAsync(IServiceProvider services, CancellationToken ct)
    {
        var scopes = services.GetRequiredService<IServiceScopeFactory>();
        foreach (var entry in folder.Ready())
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var reason = InboxRules.Problem(entry.File.Name, entry.File.Length)
                    ?? await scope.ServiceProvider.GetRequiredService<IImportInboxReceiver>().ReceiveAsync(
                        new InboxDrop(entry.Folder, entry.File.Name, await File.ReadAllBytesAsync(entry.File.FullName, ct)),
                        ct);
                if (reason is null)
                {
                    folder.Done(entry);
                }
                else
                {
                    Logger.LogWarning("Import inbox file {File} was not used: {Reason}", entry.File.Name, reason);
                    folder.Fail(entry, reason);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                Logger.LogError(ex, "Import inbox file {File} could not be handled; it stays for the next pass.", entry.File.Name);
            }
        }
    }
}
