using FastEndpoints;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetPortfolio;

public sealed class GetPortfolioEndpoint(IInvestmentService investmentService)
    : Endpoint<GetPortfolioRequest, PortfolioResponse>
{
    public override void Configure()
    {
        Get("investments/portfolio");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(GetPortfolioRequest req, CancellationToken ct) =>
        await Send.OkAsync(await investmentService.GetPortfolioAsync(req, ct), ct);
}
