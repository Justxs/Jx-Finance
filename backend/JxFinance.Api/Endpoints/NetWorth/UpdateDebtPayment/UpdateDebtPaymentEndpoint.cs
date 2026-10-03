using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.UpdateDebtPayment;

public sealed class UpdateDebtPaymentEndpoint(IDebtService debtService)
    : Endpoint<UpdateDebtPaymentRequest, DebtResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Debts + "/{id}/payments/{paymentId}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateDebtPaymentRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await debtService.UpdateDebtPaymentAsync(req, ct), ct);
}
