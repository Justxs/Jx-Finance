using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetSecurityPrices;

public sealed class GetSecurityPricesSummary : Summary<GetSecurityPricesEndpoint, GetSecurityPricesRequest>
{
    public GetSecurityPricesSummary()
    {
        Summary = "List the price history of a security";
        Description = "Returns the recorded prices of a security, one per date, newest first. A point is written "
            + "whenever a price is set by hand, a security is saved with a price, or a broker import carries a mark "
            + "price for an open position. There is no market data feed, so dates between points have no row. Like "
            + "securities themselves, the history is shared by every user of the installation.";
        RequestParam(r => r.From, "Only points on or after this date.");
        RequestParam(r => r.To, "Only points on or before this date.");
        Responses[200] = "The history points, newest first.";
        Responses[404] = "No such security.";
    }
}
