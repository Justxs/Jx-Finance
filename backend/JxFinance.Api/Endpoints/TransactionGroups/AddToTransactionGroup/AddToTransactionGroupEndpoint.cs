using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;

namespace JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;

public sealed class AddToTransactionGroupEndpoint(ITransactionGroupService groupService)
    : Endpoint<AddToTransactionGroupRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.TransactionGroups + "/{id}/members");
        Group<TransactionGroupsGroup>();
        Description(d => d
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblemDetails(403)
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(AddToTransactionGroupRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await groupService.AddAsync(req, ct), ct);
}
