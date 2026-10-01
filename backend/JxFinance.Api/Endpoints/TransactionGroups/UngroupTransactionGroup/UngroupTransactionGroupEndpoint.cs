using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.TransactionGroups.Interfaces;

namespace JxFinance.Endpoints.TransactionGroups.UngroupTransactionGroup;

public sealed class UngroupTransactionGroupEndpoint(ITransactionGroupService groupService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.TransactionGroups + "/{id}");
        Group<TransactionGroupsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        groupService.UngroupAsync(id, ct);
}
