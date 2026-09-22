using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed class RestoreBackupEndpoint(IBackupService backupService, ISessionService sessionService)
    : Endpoint<RestoreBackupRequest, RestoreBackupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Backups + "/{id}/restore");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409).Produces(429));
    }

    public override async Task HandleAsync(RestoreBackupRequest req, CancellationToken ct)
    {
        var result = await backupService.RestoreAsync(req.Id, req.Password, ct);
        if (!result.TryGetValue(out var restored))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        await sessionService.SignOutAsync(ct);
        await Send.OkAsync(restored, ct);
    }
}
