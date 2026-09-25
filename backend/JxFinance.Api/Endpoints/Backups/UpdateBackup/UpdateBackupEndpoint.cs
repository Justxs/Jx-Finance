using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.UpdateBackup;

public sealed class UpdateBackupEndpoint(IBackupService backupService) : Endpoint<UpdateBackupRequest, BackupResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Backups + "/{id}");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateBackupRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await backupService.UpdateAsync(req.Id, req.Note, ct), ct);
}
