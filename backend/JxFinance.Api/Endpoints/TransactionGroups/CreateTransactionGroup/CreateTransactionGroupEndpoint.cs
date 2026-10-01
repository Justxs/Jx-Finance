using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;

public sealed class CreateTransactionGroupEndpoint(ITransactionGroupService groupService)
    : Endpoint<CreateTransactionGroupRequest, TransactionGroupResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.TransactionGroups);
        Group<TransactionGroupsGroup>();
        Description(d => d
            .ProducesCreated<TransactionGroupResponse>()
            .ProducesProblemDetails(403)
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreateTransactionGroupRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await groupService.CreateAsync(req, ct),
            group => $"{ApiRoutes.TransactionGroupsPath}/{group.Id}",
            ct);
}
