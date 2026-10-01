using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;

namespace JxFinance.Endpoints.TransactionGroups.RemoveFromTransactionGroup;

public sealed class RemoveFromTransactionGroupEndpoint(ITransactionGroupService groupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(ApiRoutes.TransactionGroups + "/{id}/members/{transactionId}");
        Group<TransactionGroupsGroup>();
        Description(d => d.Produces(StatusCodes.Status204NoContent).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(
            await groupService.RemoveAsync(Route<Guid>("id"), Route<Guid>("transactionId"), ct),
            ct);
}
