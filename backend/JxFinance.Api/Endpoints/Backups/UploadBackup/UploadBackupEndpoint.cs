using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupEndpoint(IBackupService backupService) : Endpoint<UploadBackupRequest, BackupResponse>
{
    public const long MaxFileBytes = 2L * 1024 * 1024 * 1024;

    public override void Configure()
    {
        Post(ApiRoutes.Backups + "/upload");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        AllowFileUploads();
        MaxRequestBodySize(MaxFileBytes + (1024 * 1024));
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.ProducesCreated<BackupResponse>().ProducesProblemDetails(403).Produces(429));
    }

    public override async Task HandleAsync(UploadBackupRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > MaxFileBytes)
        {
            AddError(r => r.File, "Choose a non-empty backup file no larger than 2 GB.", ErrorCodes.BackupInvalidFile);
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }

        await using var stream = req.File.OpenReadStream();
        await Send.CreatedOrProblemAsync(await backupService.UploadAsync(stream, req.Note, ct), backup => $"{ApiRoutes.BackupsPath}/{backup.Id}", ct);
    }
}
