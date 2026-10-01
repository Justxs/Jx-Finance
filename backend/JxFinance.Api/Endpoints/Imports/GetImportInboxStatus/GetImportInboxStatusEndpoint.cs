using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Imports.GetImportInboxStatus;

public sealed class GetImportInboxStatusEndpoint(IImportInboxService inboxService)
    : EndpointWithoutRequest<ImportInboxStatusResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.ImportInbox + "/status");
        Group<ImportsGroup>();
        Roles(AppRoles.Admin);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(inboxService.GetStatus(), ct);
}
