using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetPortfolio;

public sealed class GetPortfolioSummary : Summary<GetPortfolioEndpoint, GetPortfolioRequest>
{
    public GetPortfolioSummary()
    {
        Summary = "Get the investment portfolio";
        Description = "Returns open holdings with first-in-first-out cost basis, market value at the last known price, "
            + "and unrealised gain in each security's own currency. Totals and the per-year income table are in the "
            + "reporting currency: market value and cost at the newest exchange rate, realised gains, dividends, tax "
            + "and fees at the rate on each transaction's date. IsComplete is false when a holding has no price or no "
            + "exchange rate, in which case totals leave it out.";
        RequestParam(r => r.AccountId, "Only holdings and income on this account.");
        Responses[200] = "The portfolio.";
    }
}
