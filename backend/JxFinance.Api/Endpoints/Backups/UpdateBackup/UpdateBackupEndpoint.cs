using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.UpdateBackup;

public sealed class UpdateBackupEndpoint(IBackupService backupService) : Endpoint<UpdateBackupRequest, BackupResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Backups + "/{id}");
        Group<BackupsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateBackupRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await backupService.UpdateAsync(req.Id, req.Note, ct), ct);
}
