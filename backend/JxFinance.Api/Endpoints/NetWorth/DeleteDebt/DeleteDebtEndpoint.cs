using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.DeleteDebt;

public sealed class DeleteDebtEndpoint(INetWorthService netWorthService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("debts/{id}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await netWorthService.DeleteDebtAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
