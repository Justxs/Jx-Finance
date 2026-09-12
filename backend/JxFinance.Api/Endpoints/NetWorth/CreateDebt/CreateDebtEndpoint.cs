using FastEndpoints;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtEndpoint(INetWorthService netWorthService) : Endpoint<CreateDebtRequest, DebtResponse>
{
    public override void Configure()
    {
        Post("debts");
        Group<NetWorthGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<DebtResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateDebtRequest req, CancellationToken ct)
    {
        var debt = await netWorthService.CreateDebtAsync(req, ct);
        await Send.ResultAsync(TypedResults.Created($"/api/debts/{debt.Id}", debt));
    }
}
