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
        Get("trash");
        Group<TrashGroup>();
    }

    public override async Task HandleAsync(GetTrashRequest req, CancellationToken ct)
    {
        var page = await trashService.GetPageAsync(req, ct);
        await Send.OkAsync(page, ct);
    }
}
