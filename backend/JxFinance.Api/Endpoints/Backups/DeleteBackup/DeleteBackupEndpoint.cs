using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups.DeleteBackup;

public sealed class DeleteBackupEndpoint(IBackupService backupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(ApiRoutes.Backups + "/{id}");
        Group<BackupsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await backupService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
