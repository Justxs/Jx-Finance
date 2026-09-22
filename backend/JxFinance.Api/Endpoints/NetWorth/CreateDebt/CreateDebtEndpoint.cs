using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed class CreateDebtEndpoint(INetWorthService netWorthService) : Endpoint<CreateDebtRequest, DebtResponse, DebtMapper>
{
    public override void Configure()
    {
        Post(ApiRoutes.Debts);
        Group<NetWorthGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<DebtResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateDebtRequest req, CancellationToken ct)
    {
        var debt = Map.FromEntity(await netWorthService.CreateDebtAsync(Map.ToEntity(req), ct));
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.DebtsPath}/{debt.Id}", debt));
    }
}
