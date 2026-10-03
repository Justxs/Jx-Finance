using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed class UpdateDebtEndpoint(IDebtService debtService) : Endpoint<UpdateDebtRequest, DebtResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Debts + "/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateDebtRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await debtService.UpdateDebtAsync(req, ct), ct);
}
