using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed class UpdateDebtEndpoint(INetWorthService netWorthService) : Endpoint<UpdateDebtRequest, DebtResponse, DebtMapper>
{
    public override void Configure()
    {
        Put("debts/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateDebtRequest req, CancellationToken ct)
    {
        var debt = (await netWorthService.UpdateDebtAsync(req.Id, entity => Map.Apply(req, entity), ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(debt), ct);
    }
}
