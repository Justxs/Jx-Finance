using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetInvestmentTransactions;

public sealed class GetInvestmentTransactionsEndpoint(IInvestmentService investmentService)
    : Endpoint<GetInvestmentTransactionsRequest, PagedResponse<InvestmentTransactionResponse>>
{
    public override void Configure()
    {
        Get("investments/transactions");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(GetInvestmentTransactionsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await investmentService.GetTransactionsAsync(req, ct), ct);
}
