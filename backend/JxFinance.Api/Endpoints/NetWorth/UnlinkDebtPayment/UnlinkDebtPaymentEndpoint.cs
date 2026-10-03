using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;

namespace JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;

public sealed class UnlinkDebtPaymentEndpoint(IDebtService debtService) : Endpoint<UnlinkDebtPaymentRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Debts + "/{id}/payments/{paymentId}");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UnlinkDebtPaymentRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await debtService.UnlinkDebtPaymentAsync(req, ct), ct);
}
