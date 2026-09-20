using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteDebt;

public sealed class DeleteDebtEndpoint(INetWorthService netWorthService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("debts/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        netWorthService.DeleteDebtAsync(id, ct);
}
