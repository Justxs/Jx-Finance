using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtEndpoint(IDebtService debtService) : Endpoint<CreateDebtRequest, DebtResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Debts);
        Group<NetWorthGroup>();
        Description(d => d.ProducesCreated<DebtResponse>());
    }

    public override async Task HandleAsync(CreateDebtRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await debtService.CreateDebtAsync(req, ct), debt => debt.Id, ct);
}
