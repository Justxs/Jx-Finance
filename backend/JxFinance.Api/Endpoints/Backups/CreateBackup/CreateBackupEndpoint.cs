using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.CreateBackup;

public sealed class CreateBackupEndpoint(IBackupService backupService) : Endpoint<CreateBackupRequest, BackupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Backups);
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.ClearDefaultProduces(200).Produces<BackupResponse>(201, MediaTypeNames.Application.Json).ProducesProblemDetails(403).Produces(429));
    }

    public override async Task HandleAsync(CreateBackupRequest req, CancellationToken ct)
    {
        var backup = await backupService.CreateAsync(req.Note, ct);
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.BackupsPath}/{backup.Id}", backup));
    }
}
