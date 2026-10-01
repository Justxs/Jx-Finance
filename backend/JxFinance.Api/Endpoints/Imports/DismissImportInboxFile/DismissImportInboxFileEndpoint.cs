using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.DismissImportInboxFile;

public sealed class DismissImportInboxFileEndpoint(IImportInboxService inboxService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.ImportInbox + "/{id}");
        Group<ImportsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        inboxService.DismissAsync(id, ct);
}
