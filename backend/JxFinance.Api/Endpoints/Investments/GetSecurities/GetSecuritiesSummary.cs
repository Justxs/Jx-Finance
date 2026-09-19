using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetSecurities;

public sealed class GetSecuritiesSummary : Summary<GetSecuritiesEndpoint, GetSecuritiesRequest>
{
    public GetSecuritiesSummary()
    {
        Summary = "List securities";
        Description = "Securities are shared by everyone on the installation, because a price is the same for all holders.";
        RequestParam(r => r.Search, "Matches symbol, name or ISIN.");
        Responses[200] = "Matching securities ordered by symbol.";
    }
}
