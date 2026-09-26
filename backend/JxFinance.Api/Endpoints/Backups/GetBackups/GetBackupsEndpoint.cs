using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.GetBackups;

public sealed class GetBackupsEndpoint(IBackupService backupService) : EndpointWithoutRequest<IReadOnlyList<BackupResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Backups);
        Group<BackupsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await backupService.GetAllAsync(ct), ct);
}
