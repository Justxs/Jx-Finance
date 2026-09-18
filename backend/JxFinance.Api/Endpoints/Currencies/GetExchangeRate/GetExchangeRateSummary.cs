using FastEndpoints;

namespace JxFinance.Endpoints.Currencies.GetExchangeRate;

public sealed class GetExchangeRateSummary : Summary<GetExchangeRateEndpoint, GetExchangeRateRequest>
{
    public GetExchangeRateSummary()
    {
        Summary = "Look up an exchange rate";
        Description = "Returns how many units of the target currency one unit of the source currency buys, "
            + "using the newest reference rate on or before the date. Weekends and holidays fall back to "
            + "the previous business day.";
        RequestParam(r => r.Date, "Rate date as YYYY-MM-DD. Defaults to today.");
        Responses[200] = "The rate and the date it was published for.";
        Responses[404] = "No rate is stored or reachable for that pair.";
    }
}
