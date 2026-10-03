using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteDebt;

public sealed class DeleteDebtEndpoint(IDebtService debtService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Debts + "/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        debtService.DeleteDebtAsync(id, ct);
}
