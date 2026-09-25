using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Trash.Interfaces;

namespace JxFinance.Endpoints.Trash.RestoreDeleted;

public sealed class RestoreDeletedEndpoint(ITrashService trashService) : Endpoint<RestoreDeletedRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.Trash + "/restore");
        Group<TrashGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(RestoreDeletedRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await trashService.RestoreAsync(req, ct), ct);
}
