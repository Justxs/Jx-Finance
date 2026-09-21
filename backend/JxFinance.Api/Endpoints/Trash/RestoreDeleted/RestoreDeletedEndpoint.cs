using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Trash.Interfaces;

namespace JxFinance.Endpoints.Trash.RestoreDeleted;

public sealed class RestoreDeletedEndpoint(ITrashService trashService) : Endpoint<RestoreDeletedRequest>
{
    public override void Configure()
    {
        Post("trash/restore");
        Group<TrashGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(RestoreDeletedRequest req, CancellationToken ct)
    {
        (await trashService.RestoreAsync(req, ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
