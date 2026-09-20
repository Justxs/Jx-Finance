using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupEndpoint(IBackupService backupService) : Endpoint<UploadBackupRequest, BackupResponse>
{
    public const int MaxFileBytes = 100 * 1024 * 1024;

    public override void Configure()
    {
        Post("backups/upload");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        AllowFileUploads();
        MaxRequestBodySize(MaxFileBytes + (1024 * 1024));
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.ClearDefaultProduces(200).Produces<BackupResponse>(201, "application/json").ProducesProblemDetails(403).Produces(429));
    }

    public override async Task HandleAsync(UploadBackupRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > MaxFileBytes)
            ThrowError(r => r.File, "Choose a non-empty backup file no larger than 100 MB.", ErrorCodes.BackupInvalidFile);

        await using var stream = req.File.OpenReadStream();
        var backup = (await backupService.UploadAsync(stream, req.Note, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/backups/{backup.Id}", backup));
    }
}
