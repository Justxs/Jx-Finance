using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;

public sealed class RenameTransactionGroupEndpoint(ITransactionGroupService groupService)
    : Endpoint<RenameTransactionGroupRequest, TransactionGroupResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.TransactionGroups + "/{id}");
        Group<TransactionGroupsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(RenameTransactionGroupRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await groupService.RenameAsync(req, ct), ct);
}
