using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebtPayments;

public sealed class GetDebtPaymentsEndpoint(IDebtService debtService)
    : EndpointWithoutRequest<IReadOnlyList<DebtPaymentResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Debts + "/{id}/payments");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await debtService.GetDebtPaymentsAsync(Route<Guid>("id"), ct), ct);
}
