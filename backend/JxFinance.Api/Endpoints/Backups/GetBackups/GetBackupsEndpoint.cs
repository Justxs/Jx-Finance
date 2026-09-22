using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.GetBackups;

public sealed class GetBackupsEndpoint(IBackupService backupService) : EndpointWithoutRequest<IReadOnlyList<BackupResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Backups);
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await backupService.GetAllAsync(ct), ct);
    }
}
