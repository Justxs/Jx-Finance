using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Trash.Interfaces;
using JxFinance.Endpoints.Trash.Shared;

namespace JxFinance.Endpoints.Trash.GetTrash;

public sealed class GetTrashEndpoint(ITrashService trashService)
    : Endpoint<GetTrashRequest, PagedResponse<TrashEntryResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Trash);
        Group<TrashGroup>();
    }

    public override async Task HandleAsync(GetTrashRequest req, CancellationToken ct) =>
        await Send.OkAsync(await trashService.GetPageAsync(req, ct), ct);
}
