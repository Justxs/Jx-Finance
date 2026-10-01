using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.ListImportInbox;

public sealed class ListImportInboxEndpoint(IImportInboxService inboxService)
    : EndpointWithoutRequest<IReadOnlyList<ImportInboxFileResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.ImportInbox);
        Group<ImportsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await inboxService.ListAsync(ct), ct);
}
