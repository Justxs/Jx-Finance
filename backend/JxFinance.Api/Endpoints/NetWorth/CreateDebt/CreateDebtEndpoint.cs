using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtEndpoint(INetWorthService netWorthService) : Endpoint<CreateDebtRequest, DebtResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Debts);
        Group<NetWorthGroup>();
        Description(d => d.ProducesCreated<DebtResponse>());
    }

    public override async Task HandleAsync(CreateDebtRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await netWorthService.CreateDebtAsync(req, ct), debt => $"{ApiRoutes.DebtsPath}/{debt.Id}", ct);
    }
}
