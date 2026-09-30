using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class CreateSecuritySummary : Summary<CreateSecurityEndpoint, SaveSecurityRequest>
{
    public CreateSecuritySummary()
    {
        Summary = "Add a security";
        Description = "Adds a stock, ETF, fund, bond or other instrument that trades can refer to. Open to every signed-in "
            + "user, because recording a first trade needs it. Symbol and currency together must be unique; the "
            + "operation only ever adds, it never changes an existing security. Only an administrator may set a price "
            + "source; anyone else leaves it at none.";
        RequestParam(r => r.LastPriceDate, "Defaults to today when a price is given without a date. Not in the future. The price is recorded in the price history; one dated before the last known price leaves the last known price alone.");
        RequestParam(r => r.PriceSource, PriceSourceText);
        RequestParam(r => r.PriceSymbol, PriceSymbolText);
        Responses[200] = "The security.";
        Responses[400] = "Invalid details, range.invalid for Kraken on a security that is not crypto in EUR, or marketPrices.keyRequired for EODHD without a saved key.";
        Responses[403] = "access.forbidden: a price source set by someone who is not an administrator.";
        Responses[409] = "A security with this symbol and currency already exists.";
    }

    internal const string PriceSourceText =
        "Where the server fetches daily closing prices: none, eodhd (needs an API key under the market price settings) or "
        + "kraken (crypto priced in EUR only). Administrators only.";

    internal const string PriceSymbolText =
        "The symbol the price source knows the security by, such as VWCE.XETRA on EODHD or XBTEUR on Kraken. Required "
        + "with a price source.";
}

public sealed class UpdateSecuritySummary : Summary<UpdateSecurityEndpoint, SaveSecurityRequest>
{
    public UpdateSecuritySummary()
    {
        Summary = "Update the details of a security";
        Description = "Changes symbol, name, ISIN, exchange, type, currency or price source, and optionally the price. "
            + "Securities are shared by every user of the installation, so only an administrator may change them; anyone "
            + "who holds the security sets its price through the price operation instead. The currency cannot change "
            + "once the security has transactions. Changing the price source or symbol clears the last fetch result, "
            + "and the next fetch fills the history from the first trade.";
        RequestParam(r => r.LastPriceDate, "Defaults to today when a price is given without a date. Not in the future. The price is recorded in the price history; one dated before the last known price leaves the last known price alone.");
        RequestParam(r => r.PriceSource, CreateSecuritySummary.PriceSourceText);
        RequestParam(r => r.PriceSymbol, CreateSecuritySummary.PriceSymbolText);
        Responses[200] = "The security.";
        Responses[400] = "Invalid details, range.invalid for Kraken on a security that is not crypto in EUR, or marketPrices.keyRequired for EODHD without a saved key.";
        Responses[403] = "The caller is not an administrator.";
        Responses[404] = "No such security.";
        Responses[409] = "Another security already has this symbol and currency.";
    }
}
