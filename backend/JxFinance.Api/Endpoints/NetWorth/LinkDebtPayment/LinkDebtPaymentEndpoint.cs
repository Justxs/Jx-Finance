using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.LinkDebtPayment;

public sealed class LinkDebtPaymentEndpoint(INetWorthService netWorthService)
    : Endpoint<LinkDebtPaymentRequest, DebtResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Debts + "/{id}/payments");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(LinkDebtPaymentRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.LinkDebtPaymentAsync(req, ct), ct);
}
