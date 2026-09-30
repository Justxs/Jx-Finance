using FastEndpoints;

namespace JxFinance.Endpoints.Investments.FindPriceSymbol;

public sealed class FindPriceSymbolSummary : Summary<FindPriceSymbolEndpoint>
{
    public FindPriceSymbolSummary()
    {
        Summary = "Look up the EODHD symbols of a security";
        Description = "Asks EODHD's search for the security's ISIN and answers the listings it knows, each with the "
            + "symbol to use as the price symbol, the exchange, the name and the currency it is quoted in. Saves nothing. "
            + "Each lookup is one of the day's EODHD calls. Administrators only.";
        Responses[200] = "The candidate listings, possibly none.";
        Responses[400] = "required when the security has no ISIN, marketPrices.keyRequired or marketPrices.keyUnreadable "
            + "for a missing or unreadable key, marketPrices.unavailable when EODHD could not be reached, or "
            + "marketPrices.rejected when it refused or today's calls are used up.";
        Responses[403] = "Only administrators can look up price symbols.";
        Responses[404] = "No such security.";
    }
}
