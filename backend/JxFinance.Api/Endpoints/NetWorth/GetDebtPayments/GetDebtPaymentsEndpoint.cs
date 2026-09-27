using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebtPayments;

public sealed class GetDebtPaymentsEndpoint(INetWorthService netWorthService)
    : EndpointWithoutRequest<IReadOnlyList<DebtPaymentResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Debts + "/{id}/payments");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.GetDebtPaymentsAsync(Route<Guid>("id"), ct), ct);
}
