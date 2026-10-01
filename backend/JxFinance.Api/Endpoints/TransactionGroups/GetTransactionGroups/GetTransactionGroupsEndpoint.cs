using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroups;

public sealed class GetTransactionGroupsEndpoint(ITransactionGroupService groupService)
    : EndpointWithoutRequest<IReadOnlyList<TransactionGroupResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.TransactionGroups);
        Group<TransactionGroupsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await groupService.GetAllAsync(ct), ct);
}
