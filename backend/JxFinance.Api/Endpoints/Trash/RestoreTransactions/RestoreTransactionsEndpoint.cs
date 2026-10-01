using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Trash.Interfaces;

namespace JxFinance.Endpoints.Trash.RestoreTransactions;

public sealed class RestoreTransactionsEndpoint(ITrashService trashService)
    : Endpoint<RestoreTransactionsRequest, RestoreTransactionsResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Trash + "/restore-transactions");
        Group<TrashGroup>();
    }

    public override async Task HandleAsync(RestoreTransactionsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await trashService.RestoreTransactionsAsync(req, ct), ct);
}
