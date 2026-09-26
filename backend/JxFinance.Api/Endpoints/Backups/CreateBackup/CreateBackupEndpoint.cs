using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.CreateBackup;

public sealed class CreateBackupEndpoint(IBackupService backupService) : Endpoint<CreateBackupRequest, BackupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Backups);
        Group<BackupsGroup>();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.ProducesCreated<BackupResponse>().Produces(429));
    }

    public override async Task HandleAsync(CreateBackupRequest req, CancellationToken ct)
    {
        var backup = await backupService.CreateAsync(req.Note, ct);
        await Send.CreatedAsync($"{ApiRoutes.BackupsPath}/{backup.Id}", backup, ct);
    }
}
