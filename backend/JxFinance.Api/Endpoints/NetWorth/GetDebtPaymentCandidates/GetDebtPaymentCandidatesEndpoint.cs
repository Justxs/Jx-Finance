using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;

public sealed class GetDebtPaymentCandidatesEndpoint(INetWorthService netWorthService)
    : Endpoint<GetDebtPaymentCandidatesRequest, IReadOnlyList<TransactionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Debts + "/{id}/payment-candidates");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetDebtPaymentCandidatesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await netWorthService.GetDebtPaymentCandidatesAsync(req, ct), ct);
}
