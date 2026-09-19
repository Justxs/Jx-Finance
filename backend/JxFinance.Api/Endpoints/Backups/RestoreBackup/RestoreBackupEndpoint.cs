using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed class RestoreBackupEndpoint(IBackupService backupService, ISessionService sessionService)
    : EndpointWithoutRequest<RestoreBackupResponse>
{
    public override void Configure()
    {
        Post("backups/{id}/restore");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var restored = (await backupService.RestoreAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await sessionService.SignOutAsync(ct);
        await Send.OkAsync(restored, ct);
    }
}
