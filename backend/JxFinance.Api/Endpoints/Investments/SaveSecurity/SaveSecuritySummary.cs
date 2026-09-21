using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class CreateSecuritySummary : Summary<CreateSecurityEndpoint, SaveSecurityRequest>
{
    public CreateSecuritySummary()
    {
        Summary = "Add a security";
        Description = "Adds a stock, ETF, fund, bond or other instrument that trades can refer to. Open to every signed-in "
            + "user, because recording a first trade needs it. Symbol and currency together must be unique; the "
            + "operation only ever adds, it never changes an existing security.";
        RequestParam(r => r.LastPriceDate, "Defaults to today when a price is given without a date. Not in the future. The price is recorded in the price history; one dated before the last known price leaves the last known price alone.");
        Responses[200] = "The security.";
        Responses[409] = "A security with this symbol and currency already exists.";
    }
}

public sealed class UpdateSecuritySummary : Summary<UpdateSecurityEndpoint, SaveSecurityRequest>
{
    public UpdateSecuritySummary()
    {
        Summary = "Update the details of a security";
        Description = "Changes symbol, name, ISIN, exchange, type or currency, and optionally the price. Securities are "
            + "shared by every user of the installation, so only an administrator may change them; anyone who holds "
            + "the security sets its price through the price operation instead. The currency cannot change once the "
            + "security has transactions.";
        RequestParam(r => r.LastPriceDate, "Defaults to today when a price is given without a date. Not in the future. The price is recorded in the price history; one dated before the last known price leaves the last known price alone.");
        Responses[200] = "The security.";
        Responses[403] = "The caller is not an administrator.";
        Responses[404] = "No such security.";
        Responses[409] = "Another security already has this symbol and currency.";
    }
}
