using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroupMembers;

public sealed class GetTransactionGroupMembersEndpoint(ITransactionGroupService groupService)
    : Endpoint<GetTransactionGroupMembersRequest, GroupMembersResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.TransactionGroups + "/{id}/members");
        Group<TransactionGroupsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetTransactionGroupMembersRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await groupService.GetMembersAsync(req, ct), ct);
}
